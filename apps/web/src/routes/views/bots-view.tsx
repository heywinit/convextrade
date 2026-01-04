import { Bot } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "../utils";

type TokenData = {
  price: number | undefined;
  chartData: Array<{ timestamp: number; price: number }>;
  changePercentage: number;
};

type TokenDataMap = {
  CNVX: TokenData;
  BUN: TokenData;
  VITE: TokenData;
  SHAD: TokenData;
  FLWR: TokenData;
};

type BotsViewProps = {
  tokenDataMap: TokenDataMap;
};

export function BotsView({ tokenDataMap }: BotsViewProps) {
  const bots = useQuery(api.bots.getBots) ?? [];

  return (
    <div className="col-span-3 row-span-2">
      <Card className="h-full">
        <CardContent className="flex h-min flex-col px-4">
          <h2 className="font-semibold text-xl">Trading Bots</h2>
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => {
              const tokenBalances =
                (bot.tokenBalances as Record<string, number> | undefined) ?? {};
              const cnvxBalance = bot.cnvxAmount ?? tokenBalances.CNVX ?? 0;
              const totalTokenValue = Object.entries(tokenBalances).reduce(
                (sum, [token, amount]) => {
                  const tokenPrice =
                    tokenDataMap[token as keyof typeof tokenDataMap]?.price ??
                    0;
                  return sum + tokenPrice * (amount as number);
                },
                0,
              );
              const totalValue = bot.balance + totalTokenValue;

              return (
                <Card key={bot._id} className="h-min">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl">{bot.username}</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="font-medium">
                        {formatCurrency(bot.balance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Value:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(totalValue)}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <p className="mb-1 text-muted-foreground text-xs">
                        Token Holdings:
                      </p>
                      <div className="space-y-1">
                        {Object.entries(tokenBalances).map(
                          ([token, amount]) => {
                            if ((amount as number) > 0) {
                              return (
                                <div
                                  key={token}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-muted-foreground">
                                    {token}:
                                  </span>
                                  <span className="font-medium">
                                    {(amount as number).toFixed(4)}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          },
                        )}
                        {cnvxBalance > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">CNVX:</span>
                            <span className="font-medium">
                              {cnvxBalance.toFixed(4)}
                            </span>
                          </div>
                        )}
                        {Object.values(tokenBalances).every(
                          (v) => (v as number) === 0,
                        ) &&
                          cnvxBalance === 0 && (
                            <span className="text-muted-foreground text-xs">
                              No tokens held
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
