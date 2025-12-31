"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

export function OrderForm({ userId }: { userId: string | null }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const currentPrice = useQuery((api as any).orders.getCurrentPrice);
  const user = useQuery(
    (api as any).users.getUser,
    userId ? { userId: userId as any } : "skip",
  );
  const orderbook = useQuery((api as any).orders.getOrderbook);
  const placeLimitOrder = useMutation((api as any).orders.placeLimitOrder);
  const placeMarketOrder = useMutation((api as any).orders.placeMarketOrder);

  // Calculate required balance/CNVX and check if sufficient
  const balanceCheck = useMemo(() => {
    if (!user) return { valid: false, error: "Loading user data..." };
    
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return { valid: false, error: null };
    }

    if (side === "buy") {
      let requiredBalance = 0;
      
      if (orderType === "limit") {
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
          return { valid: false, error: null };
        }
        requiredBalance = priceNum * quantityNum;
      } else {
        // Market order - estimate worst case from orderbook
        if (orderbook && orderbook.sells && Array.isArray(orderbook.sells) && orderbook.sells.length > 0) {
          // Get highest sell price (worst case for buyer)
          const highestSell = orderbook.sells.reduce((max: any, order: any) => 
            (order.price ?? 0) > (max.price ?? 0) ? order : max
          );
          requiredBalance = (highestSell.price ?? currentPrice ?? 10) * quantityNum;
        } else if (currentPrice) {
          // Fallback to current price with 20% buffer for market orders
          requiredBalance = currentPrice * quantityNum * 1.2;
        } else {
          // Final fallback
          requiredBalance = 10 * quantityNum * 1.2; // Default price with buffer
        }
      }

      if (user.balance < requiredBalance) {
        return {
          valid: false,
          error: `Insufficient balance. Required: $${requiredBalance.toFixed(2)}, Available: $${user.balance.toFixed(2)}`,
        };
      }

      return { valid: true, error: null, required: requiredBalance };
    } else {
      // Sell order
      if (user.cnvxAmount < quantityNum) {
        return {
          valid: false,
          error: `Insufficient CNVX. Required: ${quantityNum.toFixed(4)}, Available: ${user.cnvxAmount.toFixed(4)}`,
        };
      }

      return { valid: true, error: null };
    }
  }, [user, side, orderType, price, quantity, orderbook, currentPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please wait for user initialization");
      return;
    }

    if (!balanceCheck.valid) {
      if (balanceCheck.error) {
        toast.error(balanceCheck.error);
      }
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error("Invalid quantity");
      return;
    }

    try {
      if (orderType === "limit") {
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
          toast.error("Invalid price", {
            description: "Please enter a valid price greater than 0",
          });
          return;
        }
        await placeLimitOrder({
          userId: userId as any,
          side,
          price: priceNum,
          quantity: quantityNum,
        });
        toast.success(`${side === "buy" ? "Buy" : "Sell"} limit order placed`, {
          description: `${quantityNum.toFixed(4)} CNVX at $${priceNum.toFixed(2)}`,
        });
      } else {
        await placeMarketOrder({
          userId: userId as any,
          side,
          quantity: quantityNum,
        });
        toast.success(`${side === "buy" ? "Buy" : "Sell"} market order placed`, {
          description: `${quantityNum.toFixed(4)} CNVX at market price`,
        });
      }
      setPrice("");
      setQuantity("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to place order";
      toast.error("Order failed", {
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const setMarketPrice = () => {
    if (currentPrice) {
      setPrice(currentPrice.toFixed(2));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buy/Sell toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={side === "buy" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSide("buy")}
            >
              Buy
            </Button>
            <Button
              type="button"
              variant={side === "sell" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSide("sell")}
            >
              Sell
            </Button>
          </div>

          {/* Order type toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={orderType === "limit" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setOrderType("limit")}
            >
              Limit
            </Button>
            <Button
              type="button"
              variant={orderType === "market" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setOrderType("market")}
            >
              Market
            </Button>
          </div>

          {/* Price input (only for limit orders) */}
          {orderType === "limit" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="price">Price (USD)</Label>
                {currentPrice && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={setMarketPrice}
                    className="text-xs"
                  >
                    Market: ${currentPrice.toFixed(2)}
                  </Button>
                )}
              </div>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          )}

          {/* Quantity input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (CNVX)</Label>
            <Input
              id="quantity"
              type="number"
              step="0.0001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.0000"
              required
            />
          </div>

          {/* Balance info and validation */}
          {user && quantity && (
            <div className="space-y-1 rounded border border-border bg-muted/30 p-2 text-xs">
              {side === "buy" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available Balance:</span>
                    <span className="font-medium">${user.balance.toFixed(2)}</span>
                  </div>
                  {orderType === "limit" && price && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Required:</span>
                      <span className="font-medium">
                        ${(parseFloat(price) * parseFloat(quantity)).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {orderType === "market" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Required:</span>
                      <span className="font-medium">
                        ${balanceCheck.required?.toFixed(2) ?? "..."}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available CNVX:</span>
                    <span className="font-medium">{user.cnvxAmount.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required:</span>
                    <span className="font-medium">{parseFloat(quantity).toFixed(4)}</span>
                  </div>
                </>
              )}
              {balanceCheck.error && (
                <div className="mt-1 text-red-600 dark:text-red-400">
                  {balanceCheck.error}
                </div>
              )}
            </div>
          )}

          {/* Total */}
          {orderType === "limit" && price && quantity && (
            <div className="text-sm text-muted-foreground">
              Total: ${(parseFloat(price) * parseFloat(quantity)).toFixed(2)}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            variant={side === "buy" ? "default" : "destructive"}
            disabled={!balanceCheck.valid || !user}
          >
            {side === "buy" ? "Buy" : "Sell"} {orderType === "limit" ? "Limit" : "Market"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

