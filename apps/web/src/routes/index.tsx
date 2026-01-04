import { api } from "@convextrade/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Coins, Flower2, Gem, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TokenCard } from "@/components/ui/token-card";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

// Generate a unique device ID
function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

function HomeComponent() {
  const [deviceId, setDeviceId] = useState<string>("");
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

  // Fetch current prices for tokens
  const cnvxPrice = useQuery(api.orders.getCurrentPrice, { token: "CNVX" });
  const bunPrice = useQuery(api.orders.getCurrentPrice, { token: "BUN" });
  const vitePrice = useQuery(api.orders.getCurrentPrice, { token: "VITE" });
  const shadPrice = useQuery(api.orders.getCurrentPrice, { token: "SHAD" });
  const flwrPrice = useQuery(api.orders.getCurrentPrice, { token: "FLWR" });

  // Fetch price history for charts
  const cnvxHistory =
    useQuery(api.priceHistory.getPriceHistory, { token: "CNVX", limit: 30 }) ??
    [];
  const bunHistory =
    useQuery(api.priceHistory.getPriceHistory, { token: "BUN", limit: 30 }) ??
    [];
  const viteHistory =
    useQuery(api.priceHistory.getPriceHistory, { token: "VITE", limit: 30 }) ??
    [];
  const shadHistory =
    useQuery(api.priceHistory.getPriceHistory, { token: "SHAD", limit: 30 }) ??
    [];
  const flwrHistory =
    useQuery(api.priceHistory.getPriceHistory, { token: "FLWR", limit: 30 }) ??
    [];

  // Generate chart data from history
  // Charts need at least 2 data points to render properly
  const cnvxChartData = useMemo(() => {
    if (cnvxHistory.length >= 2) {
      return cnvxHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return [];
  }, [cnvxHistory]);

  const bunChartData = useMemo(() => {
    if (bunHistory.length >= 2) {
      return bunHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return [];
  }, [bunHistory]);

  const viteChartData = useMemo(() => {
    if (viteHistory.length >= 2) {
      return viteHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return [];
  }, [viteHistory]);

  const shadChartData = useMemo(() => {
    if (shadHistory.length >= 2) {
      return shadHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return [];
  }, [shadHistory]);

  const flwrChartData = useMemo(() => {
    if (flwrHistory.length >= 2) {
      return flwrHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return [];
  }, [flwrHistory]);

  // Calculate price changes
  const getPriceChange = (
    chartData: Array<{ timestamp: number; price: number }>,
    currentPrice: number | undefined,
  ) => {
    if (currentPrice === undefined || chartData.length < 2)
      return { change: 0, percentage: 0 };
    const previousPrice =
      chartData[chartData.length - 2]?.price ?? currentPrice;
    const change = currentPrice - previousPrice;
    const percentage = (change / previousPrice) * 100;
    return { change, percentage };
  };

  const cnvxChange = getPriceChange(cnvxChartData, cnvxPrice ?? undefined);
  const bunChange = getPriceChange(bunChartData, bunPrice ?? undefined);
  const viteChange = getPriceChange(viteChartData, vitePrice ?? undefined);
  const shadChange = getPriceChange(shadChartData, shadPrice ?? undefined);
  const flwrChange = getPriceChange(flwrChartData, flwrPrice ?? undefined);

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
  const formattedBalance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);

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
        <div className="mx-auto grid w-full grid-cols-3 grid-rows-2 gap-2 rounded-b-4xl border-4 border-card p-2">
          {/* Token Cards */}
          <TokenCard
            symbol="CNVX"
            icon={Coins}
            iconBgColor="bg-blue-900 hover:scale-100 cursor-default"
            iconColor="text-blue-400"
            price={cnvxPrice ?? undefined}
            changePercentage={cnvxChange.percentage}
            chartData={cnvxChartData}
          />

          <TokenCard
            symbol="BUN"
            icon={Zap}
            iconBgColor="bg-yellow-900 hover:scale-100 cursor-default"
            iconColor="text-yellow-400"
            price={bunPrice ?? undefined}
            changePercentage={bunChange.percentage}
            chartData={bunChartData}
          />

          <TokenCard
            symbol="VITE"
            icon={Sparkles}
            iconBgColor="bg-purple-900 hover:scale-100 cursor-default"
            iconColor="text-purple-400"
            price={vitePrice ?? undefined}
            changePercentage={viteChange.percentage}
            chartData={viteChartData}
          />

          <TokenCard
            symbol="SHAD"
            icon={Gem}
            iconBgColor="bg-indigo-900 hover:scale-100 cursor-default"
            iconColor="text-indigo-400"
            price={shadPrice ?? undefined}
            changePercentage={shadChange.percentage}
            chartData={shadChartData}
          />

          <Card className="col-span-2 row-span-2 flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-4">
              <div>
                <h2 className="mb-2 font-semibold text-lg">
                  About ConvexTrade
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A real-time trading terminal powered by Convex's real-time
                  sync.
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
          <TokenCard
            symbol="FLWR"
            icon={Flower2}
            iconBgColor="bg-pink-900 hover:scale-100 cursor-default"
            iconColor="text-pink-400"
            price={flwrPrice ?? undefined}
            changePercentage={flwrChange.percentage}
            chartData={flwrChartData}
          />
        </div>
      </main>
    </div>
  );
}
