import { Activity } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatTimestamp } from "../utils";

export function TradesView() {
  const trades = useQuery(api.orders.getRecentTrades, { limit: 100 }) ?? [];

  return (
    <div className="col-span-3 row-span-2">
      <Card className="h-full">
        <CardContent className="flex h-full flex-col p-0 px-4">
          <h2 className="mb-4 font-semibold text-xl">Live Trades Feed</h2>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {trades.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No trades yet. Trades will appear here in real-time.
                </p>
              ) : (
                trades.map((trade) => (
                  <Card key={trade._id} className="px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {trade.token ?? "CNVX"}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatTimestamp(trade.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(trade.price)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Qty: {trade.quantity.toFixed(4)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Total: {formatCurrency(trade.price * trade.quantity)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
