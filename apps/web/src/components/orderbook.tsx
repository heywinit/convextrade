"use client";

import { useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function Orderbook() {
  // Use optimized query with limit - server already aggregates and limits
  const orderbook = useQuery((api as any).orders.getOrderbook, { limit: 20 });

  if (!orderbook) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orderbook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  // Data is already aggregated and sorted by the server
  const aggregatedSells = orderbook.sells; // Already sorted lowest first
  const aggregatedBuys = orderbook.buys; // Already sorted highest first

  // Calculate total volume for each side to normalize progress bars
  const totalSellVolume = aggregatedSells.reduce((sum, order) => sum + order.quantity, 0);
  const totalBuyVolume = aggregatedBuys.reduce((sum, order) => sum + order.quantity, 0);
  const maxVolume = Math.max(totalSellVolume, totalBuyVolume, 1); // Avoid division by zero

  // Show top 10 of each (server already limited to 20, but we display 10)
  const displaySells = aggregatedSells.slice(0, 10);
  const displayBuys = aggregatedBuys.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orderbook</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b">
            <div className="text-right">Price</div>
            <div className="text-right">Quantity</div>
            <div className="text-right">Total</div>
          </div>

          {/* Sell orders (asks) */}
          <div className="space-y-0.5">
            {displaySells.map((order, idx) => {
              const volumePercent = (order.quantity / maxVolume) * 100;
              return (
                <div
                  key={`sell-${order.price}-${idx}`}
                  className="relative grid grid-cols-3 gap-2 text-xs hover:bg-muted/50 py-0.5 px-1 rounded overflow-hidden"
                >
                  {/* Progress bar background */}
                  <div
                    className="absolute inset-0 bg-red-500/10 dark:bg-red-500/20 transition-all duration-200"
                    style={{ width: `${volumePercent}%`, right: 0 }}
                  />
                  {/* Content */}
                  <div className="relative text-right text-red-600 dark:text-red-400 font-mono z-10">
                    ${order.price.toFixed(2)}
                  </div>
                  <div className="relative text-right font-mono z-10">
                    {order.quantity.toFixed(4)}
                  </div>
                  <div className="relative text-right font-mono text-muted-foreground z-10">
                    ${(order.price * order.quantity).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spread */}
          {displaySells.length > 0 && displayBuys.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-xs font-medium py-2 border-y my-1">
              <div className="text-right">
                Spread: ${(displayBuys[0].price - displaySells[0].price).toFixed(2)}
              </div>
              <div className="text-right">
                {(
                  ((displayBuys[0].price - displaySells[0].price) / displaySells[0].price) *
                  100
                ).toFixed(2)}
                %
              </div>
              <div></div>
            </div>
          )}

          {/* Buy orders (bids) */}
          <div className="space-y-0.5">
            {displayBuys.map((order, idx) => {
              const volumePercent = (order.quantity / maxVolume) * 100;
              return (
                <div
                  key={`buy-${order.price}-${idx}`}
                  className="relative grid grid-cols-3 gap-2 text-xs hover:bg-muted/50 py-0.5 px-1 rounded overflow-hidden"
                >
                  {/* Progress bar background */}
                  <div
                    className="absolute inset-0 bg-green-500/10 dark:bg-green-500/20 transition-all duration-200"
                    style={{ width: `${volumePercent}%`, left: 0 }}
                  />
                  {/* Content */}
                  <div className="relative text-right text-green-600 dark:text-green-400 font-mono z-10">
                    ${order.price.toFixed(2)}
                  </div>
                  <div className="relative text-right font-mono z-10">
                    {order.quantity.toFixed(4)}
                  </div>
                  <div className="relative text-right font-mono text-muted-foreground z-10">
                    ${(order.price * order.quantity).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

