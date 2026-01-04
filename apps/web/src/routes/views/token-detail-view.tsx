import { api } from "@convextrade/backend/convex/_generated/api";
import type { Id } from "@convextrade/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TokenConfig } from "../types";

type TokenData = {
  price: number | undefined;
  chartData: Array<{ timestamp: number; price: number }>;
  changePercentage: number;
};

type TokenDetailViewProps = {
  tokenSymbol: string;
  tokenData: TokenData;
  tokenConfig: TokenConfig | undefined;
  userId: string | undefined;
  onBack: () => void;
};

export function TokenDetailView({
  tokenSymbol,
  tokenData,
  tokenConfig,
  userId,
  onBack,
}: TokenDetailViewProps) {
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [axisColor, setAxisColor] = useState<string>("#888888");
  const colorRef = useRef<HTMLDivElement>(null);

  const orderbook = useQuery(api.orders.getOrderbook, {
    token: tokenSymbol,
    limit: 10,
  });

  const placeLimitOrder = useMutation(api.orders.placeLimitOrder);
  const placeMarketOrder = useMutation(api.orders.placeMarketOrder);

  const isPositive = tokenData.changePercentage >= 0;
  const chartColor = isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)";

  // Get computed color for axes (recharts doesn't support CSS variables)
  useEffect(() => {
    if (colorRef.current) {
      const computedStyle = getComputedStyle(colorRef.current);
      const color = computedStyle.color;
      setAxisColor(color);
    }
  }, []);

  // Format chart data for recharts
  const formattedData = tokenData.chartData.map((item) => ({
    timestamp: item.timestamp,
    value: item.price,
    // Format timestamp for display
    time: new Date(item.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const handlePlaceOrder = async () => {
    if (!userId) {
      alert("Please wait for user to be loaded");
      return;
    }

    const quantityNum = Number.parseFloat(quantity);
    if (Number.isNaN(quantityNum) || quantityNum <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    try {
      if (orderType === "limit") {
        const priceNum = Number.parseFloat(price);
        if (Number.isNaN(priceNum) || priceNum <= 0) {
          alert("Please enter a valid price");
          return;
        }
        await placeLimitOrder({
          userId: userId as Id<"users">,
          token: tokenSymbol,
          side: orderSide,
          price: priceNum,
          quantity: quantityNum,
        });
      } else {
        await placeMarketOrder({
          userId: userId as Id<"users">,
          token: tokenSymbol,
          side: orderSide,
          quantity: quantityNum,
        });
      }
      // Reset form
      setPrice("");
      setQuantity("");
      alert("Order placed successfully!");
    } catch (error) {
      alert(
        `Failed to place order: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const Icon = tokenConfig?.icon;
  const bestBid = orderbook?.buys[0]?.price;
  const bestAsk = orderbook?.sells[0]?.price;

  return (
    <>
      {/* Header with back button */}
      <Card className="flex h-min flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <IconButton
              icon={ArrowLeft}
              bgColor="bg-card"
              iconColor="text-muted-foreground"
              onClick={onBack}
              className="cursor-pointer hover:bg-muted"
            />
            {Icon && (
              <IconButton
                icon={Icon}
                bgColor={tokenConfig.iconBgColor}
                iconColor={tokenConfig.iconColor}
              />
            )}
            <CardTitle className="text-xl">
              <h1>{tokenSymbol}/USD</h1>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="font-bold text-2xl tabular-nums">
                {tokenData.price !== undefined
                  ? `$${tokenData.price.toFixed(2)}`
                  : "—"}
              </div>
              {tokenData.changePercentage !== undefined &&
                tokenData.changePercentage !== null && (
                  <div
                    className={cn(
                      "rounded-full px-3 py-1 font-medium text-xs tabular-nums",
                      isPositive
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400",
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {tokenData.changePercentage.toFixed(2)}%
                  </div>
                )}
            </div>
          </div>
        </CardHeader>
      </Card>
      {/* Hidden element to get computed color */}
      <div
        ref={colorRef}
        className="text-muted-foreground"
        style={{ position: "absolute", visibility: "hidden" }}
        aria-hidden="true"
      >
        .
      </div>
      <div className="grid grid-cols-3 grid-rows-2 gap-2 pt-2">
        {/* Chart */}
        <Card className="col-span-2 row-span-1 flex flex-col p-0">
          <CardContent className="flex-1 px-0">
            {formattedData.length >= 2 ? (
              <ChartContainer>
                <AreaChart
                  data={formattedData}
                  margin={{
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id={`gradient-${tokenSymbol}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={chartColor}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartColor}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--muted))"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    stroke={axisColor}
                    tick={{
                      fill: axisColor,
                      fontSize: 12,
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    stroke={axisColor}
                    tick={{
                      fill: axisColor,
                      fontSize: 12,
                    }}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{
                      color: "hsl(var(--muted-foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number | undefined) => [
                      value !== undefined ? `$${value.toFixed(2)}` : "—",
                      "Price",
                    ]}
                  />
                  <Area
                    dataKey="value"
                    fill={`url(#gradient-${tokenSymbol})`}
                    stroke={chartColor}
                    strokeWidth={2}
                    type="monotone"
                    dot={false}
                    activeDot={{ r: 4, fill: chartColor }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Insufficient data to display chart
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Panel */}
        <Card className="col-span-1 row-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm">Place Order</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {/* Order Type Toggle */}
            <div className="flex gap-2">
              <Button
                variant={orderType === "limit" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderType("limit")}
                className="flex-1"
              >
                Limit
              </Button>
              <Button
                variant={orderType === "market" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderType("market")}
                className="flex-1"
              >
                Market
              </Button>
            </div>

            {/* Order Side Toggle */}
            <div className="flex gap-2">
              <Button
                variant={orderSide === "buy" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderSide("buy")}
                className={cn(
                  "flex-1",
                  orderSide === "buy" && "bg-green-600 hover:bg-green-700",
                )}
              >
                Buy
              </Button>
              <Button
                variant={orderSide === "sell" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderSide("sell")}
                className={cn(
                  "flex-1",
                  orderSide === "sell" && "bg-red-600 hover:bg-red-700",
                )}
              >
                Sell
              </Button>
            </div>

            {/* Price Input (only for limit orders) */}
            <div className="flex gap-2">
              {orderType === "limit" && (
                <div className="flex-1 space-y-1">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={bestBid ? bestBid.toFixed(2) : "0.00"}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            {/* Place Order Button */}
            <Button
              onClick={handlePlaceOrder}
              className={cn(
                "mt-auto",
                orderSide === "buy"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700",
              )}
              disabled={!userId}
            >
              {orderSide === "buy" ? "Buy" : "Sell"} {tokenSymbol}
            </Button>
          </CardContent>
        </Card>

        {/* Orderbook */}
        <Card className="col-span-1 row-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm">Orderbook</CardTitle>
            {/* Spread */}
            {bestBid && bestAsk && (
              <div className="text-muted-foreground text-xs">
                Spread: ${(bestAsk - bestBid).toFixed(2)}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-1 gap-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {/* Sell Orders (Asks) */}
              <div className="space-y-1">
                <div className="font-semibold text-muted-foreground text-xs">
                  Asks
                </div>
                {orderbook?.sells
                  .slice()
                  .reverse()
                  .map((order) => (
                    <div
                      key={`sell-${order.price}-${order.quantity}`}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-red-500">
                        {order.price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        {order.quantity.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Buy Orders (Bids) */}
              <div className="space-y-1">
                <div className="font-semibold text-muted-foreground text-xs">
                  Bids
                </div>
                {orderbook?.buys.map((order) => (
                  <div
                    key={`buy-${order.price}-${order.quantity}`}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-green-500">
                      {order.price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      {order.quantity.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Description */}
        <Card className="col-span-2 row-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm">About {tokenSymbol}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="text-muted-foreground text-sm leading-relaxed">
              {tokenSymbol} is a digital asset traded on the ConvexTrade
              platform. This token represents a tradable unit within the
              ecosystem, with real-time price updates and order matching
              capabilities. Trade
              {tokenSymbol} using limit or market orders through the order
              panel.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
