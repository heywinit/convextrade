import { api } from "@convextrade/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  Bot,
  Coins,
  Flower2,
  Gem,
  type LucideIcon,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TokenCard } from "@/components/ui/token-card";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

// Token configuration
type TokenConfig = {
  symbol: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
};

const TOKENS: TokenConfig[] = [
  {
    symbol: "CNVX",
    icon: Coins,
    iconBgColor: "bg-blue-900 hover:scale-100 cursor-default",
    iconColor: "text-blue-400",
  },
  {
    symbol: "BUN",
    icon: Zap,
    iconBgColor: "bg-yellow-900 hover:scale-100 cursor-default",
    iconColor: "text-yellow-400",
  },
  {
    symbol: "VITE",
    icon: Sparkles,
    iconBgColor: "bg-purple-900 hover:scale-100 cursor-default",
    iconColor: "text-purple-400",
  },
  {
    symbol: "SHAD",
    icon: Gem,
    iconBgColor: "bg-indigo-900 hover:scale-100 cursor-default",
    iconColor: "text-indigo-400",
  },
  {
    symbol: "FLWR",
    icon: Flower2,
    iconBgColor: "bg-pink-900 hover:scale-100 cursor-default",
    iconColor: "text-pink-400",
  },
];

const PRICE_HISTORY_LIMIT = 30;
const MIN_CHART_DATA_POINTS = 2;

type ViewMode = "tokens" | "bots" | "trades";

// Utility functions
function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function calculatePriceChange(
  chartData: Array<{ timestamp: number; price: number }>,
  currentPrice: number | undefined,
): number {
  if (currentPrice === undefined || chartData.length < MIN_CHART_DATA_POINTS) {
    return 0;
  }
  const previousPrice = chartData[chartData.length - 2]?.price ?? currentPrice;
  const change = currentPrice - previousPrice;
  return (change / previousPrice) * 100;
}

function transformHistoryToChartData(
  history: Array<{ timestamp: number; price: number }>,
): Array<{ timestamp: number; price: number }> {
  if (history.length >= MIN_CHART_DATA_POINTS) {
    return history.map((item) => ({
      timestamp: item.timestamp,
      price: item.price,
    }));
  }
  return [];
}

// Custom hook for token data
function useTokenData(symbol: string) {
  const price = useQuery(api.orders.getCurrentPrice, { token: symbol });
  const history =
    useQuery(api.priceHistory.getPriceHistory, {
      token: symbol,
      limit: PRICE_HISTORY_LIMIT,
    }) ?? [];

  const chartData = useMemo(
    () => transformHistoryToChartData(history),
    [history],
  );

  const changePercentage = useMemo(
    () => calculatePriceChange(chartData, price ?? undefined),
    [chartData, price],
  );

  return {
    price: price ?? undefined,
    chartData,
    changePercentage,
  };
}

function HomeComponent() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("tokens");
  const getOrCreateUser = useMutation(api.auth.getOrCreateUserByDeviceId);
  const startBotTrading = useMutation(api.bots.startBotTradingLoop);
  const initializePriceHistory = useMutation(
    api.priceHistory.initializePriceHistory,
  );

  // Fetch user data by deviceId
  const user = useQuery(
    api.users.getUserByDeviceId,
    deviceId ? { deviceId } : "skip",
  );

  // Fetch bots data
  const bots = useQuery(api.bots.getBots) ?? [];

  // Fetch recent trades
  const trades = useQuery(api.orders.getRecentTrades, { limit: 100 }) ?? [];

  // Fetch token data for all tokens
  const cnvxData = useTokenData("CNVX");
  const bunData = useTokenData("BUN");
  const viteData = useTokenData("VITE");
  const shadData = useTokenData("SHAD");
  const flwrData = useTokenData("FLWR");

  // Map token data by symbol for easy access
  const tokenDataMap = {
    CNVX: cnvxData,
    BUN: bunData,
    VITE: viteData,
    SHAD: shadData,
    FLWR: flwrData,
  } as const;

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    // Auto-create or get user
    getOrCreateUser({ deviceId: id }).catch((error) => {
      console.error("Failed to get or create user:", error);
    });

    // Initialize price history with default prices (if not already initialized)
    initializePriceHistory().catch((error) => {
      console.error("Failed to initialize price history:", error);
    });

    // Start bot trading loop to generate initial trading data
    startBotTrading().catch((error) => {
      console.error("Failed to start bot trading:", error);
    });
  }, [getOrCreateUser, startBotTrading, initializePriceHistory]);

  // Format balance for display
  const balance = user?.balance ?? 0;
  const formattedBalance = formatCurrency(balance);

  // Format timestamp for display
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Render tokens view
  const renderTokensView = () => (
    <>
      {TOKENS.slice(0, 4).map((token: TokenConfig) => {
        const data = tokenDataMap[token.symbol as keyof typeof tokenDataMap];
        return (
          <TokenCard
            key={token.symbol}
            symbol={token.symbol}
            icon={token.icon}
            iconBgColor={token.iconBgColor}
            iconColor={token.iconColor}
            price={data.price}
            changePercentage={data.changePercentage}
            chartData={data.chartData}
          />
        );
      })}

      <Card className="col-span-2 row-span-2 flex flex-col">
        <CardContent className="flex flex-1 flex-col gap-4">
          <div>
            <h2 className="mb-2 font-semibold text-lg">About ConvexTrade</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A real-time trading terminal powered by Convex's real-time sync.
            </p>
          </div>

          <div className="mt-auto pt-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              <span>
                built by{" "}
                <a
                  href="https://x.com/hiwinit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  winit.
                </a>{" "}
              </span>
              <span>
                source @{" "}
                <a
                  href="https://github.com/winit-io/convextrade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github
                </a>
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {TOKENS.slice(4).map((token: TokenConfig) => {
        const data = tokenDataMap[token.symbol as keyof typeof tokenDataMap];
        return (
          <TokenCard
            key={token.symbol}
            symbol={token.symbol}
            icon={token.icon}
            iconBgColor={token.iconBgColor}
            iconColor={token.iconColor}
            price={data.price}
            changePercentage={data.changePercentage}
            chartData={data.chartData}
          />
        );
      })}
    </>
  );

  // Render bots view
  const renderBotsView = () => (
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

  // Render trades view
  const renderTradesView = () => (
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <main className="w-full max-w-5xl">
        <div className="flex items-center justify-between rounded-t-2xl border-card border-x-4 border-t-4 bg-card/50 py-2 pr-2 pl-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-3xl tracking-tight">ConvexTrade</h1>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-2">
            <span className="font-medium text-muted-foreground text-sm">
              Balance
            </span>
            <span className="font-bold text-xl tabular-nums">
              {formattedBalance}
            </span>
          </div>
        </div>
        <div className="mx-auto grid h-[650px] w-full grid-cols-3 grid-rows-2 gap-2 rounded-bl-4xl border-4 border-card p-2">
          {viewMode === "tokens" && renderTokensView()}
          {viewMode === "bots" && renderBotsView()}
          {viewMode === "trades" && renderTradesView()}
        </div>
        <div className="flex items-center justify-end gap-2 rounded-b-4xl">
          <div className="w-min rounded-b-4xl border-4 border-card border-t-0 p-2">
            <div className="flex gap-2">
              <Button
                variant={viewMode === "tokens" ? "default" : "outline"}
                className="rounded-full"
                size="icon"
                onClick={() => setViewMode("tokens")}
                title="View Tokens"
              >
                <Coins />
              </Button>
              <Button
                variant={viewMode === "bots" ? "default" : "outline"}
                className="rounded-full"
                size="icon"
                onClick={() => setViewMode("bots")}
                title="View Bots"
              >
                <Bot />
              </Button>
              <Button
                variant={viewMode === "trades" ? "default" : "outline"}
                className="rounded-full"
                size="icon"
                onClick={() => setViewMode("trades")}
                title="View Trades"
              >
                <Activity />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
