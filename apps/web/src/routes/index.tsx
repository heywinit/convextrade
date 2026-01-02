import { api } from "@convextrade/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Coins, Flower2, Gem, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
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

// Generate sample chart data for a token
function generateChartData(basePrice: number, volatility = 0.02, points = 30) {
  const now = Date.now();
  const data = [];
  let currentPrice = basePrice;

  for (let i = points; i >= 0; i--) {
    const timestamp = now - i * 60000; // 1 minute intervals
    // Random walk with slight upward/downward bias
    const change = (Math.random() - 0.5) * volatility * basePrice;
    currentPrice = Math.max(0.01, currentPrice + change);
    data.push({ timestamp, price: currentPrice });
  }

  return data;
}

function HomeComponent() {
  const [_userId, setUserId] = useState<string | null>(null);
  const [_deviceId, setDeviceId] = useState<string>("");
  const getOrCreateUser = useMutation(api.auth.getOrCreateUserByDeviceId);

  // Fetch current prices for tokens
  const cnvxPrice =
    useQuery(api.orders.getCurrentPrice, { token: "CNVX" }) ?? 10.0;
  const bunPrice =
    useQuery(api.orders.getCurrentPrice, { token: "BUN" }) ?? 5.0;
  const vitePrice =
    useQuery(api.orders.getCurrentPrice, { token: "VITE" }) ?? 15.0;
  const shadPrice =
    useQuery(api.orders.getCurrentPrice, { token: "SHAD" }) ?? 8.0;
  const flwrPrice =
    useQuery(api.orders.getCurrentPrice, { token: "FLWR" }) ?? 12.0;

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

  // Generate chart data from history or fallback to sample data
  // Charts need at least 2 data points to render properly
  const cnvxChartData = useMemo(() => {
    if (cnvxHistory.length >= 2) {
      return cnvxHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return generateChartData(cnvxPrice, 0.02, 30);
  }, [cnvxHistory, cnvxPrice]);

  const bunChartData = useMemo(() => {
    if (bunHistory.length >= 2) {
      return bunHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return generateChartData(bunPrice, 0.025, 30);
  }, [bunHistory, bunPrice]);

  const viteChartData = useMemo(() => {
    if (viteHistory.length >= 2) {
      return viteHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return generateChartData(vitePrice, 0.03, 30);
  }, [viteHistory, vitePrice]);

  const shadChartData = useMemo(() => {
    if (shadHistory.length >= 2) {
      return shadHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return generateChartData(shadPrice, 0.02, 30);
  }, [shadHistory, shadPrice]);

  const flwrChartData = useMemo(() => {
    if (flwrHistory.length >= 2) {
      return flwrHistory.map((item) => ({
        timestamp: item.timestamp,
        price: item.price,
      }));
    }
    return generateChartData(flwrPrice, 0.025, 30);
  }, [flwrHistory, flwrPrice]);

  // Calculate price changes
  const getPriceChange = (
    chartData: Array<{ timestamp: number; price: number }>,
    currentPrice: number,
  ) => {
    if (chartData.length < 2) return { change: 0, percentage: 0 };
    const previousPrice =
      chartData[chartData.length - 2]?.price ?? currentPrice;
    const change = currentPrice - previousPrice;
    const percentage = (change / previousPrice) * 100;
    return { change, percentage };
  };

  const cnvxChange = getPriceChange(cnvxChartData, cnvxPrice);
  const bunChange = getPriceChange(bunChartData, bunPrice);
  const viteChange = getPriceChange(viteChartData, vitePrice);
  const shadChange = getPriceChange(shadChartData, shadPrice);
  const flwrChange = getPriceChange(flwrChartData, flwrPrice);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    // Auto-create or get user
    getOrCreateUser({ deviceId: id })
      .then((user) => {
        setUserId(user.userId);
      })
      .catch((error) => {
        console.error("Failed to get or create user:", error);
      });
  }, [getOrCreateUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <main className="w-full max-w-5xl">
        <div className="flex items-center justify-between rounded-t-2xl border-card border-x-2 border-t-2 bg-card p-2">
          <span className="font-bold text-2xl">ConvexTrade</span>
          <span className="font-bold text-lg">$1,000</span>
        </div>
        <div className="mx-auto grid w-full grid-cols-3 grid-rows-3 gap-2 rounded-b-4xl border-2 border-card p-2">
          {/* Token Cards */}
          <TokenCard
            symbol="CNVX"
            icon={Coins}
            iconBgColor="bg-blue-900 hover:scale-100 cursor-default"
            iconColor="text-blue-400"
            price={cnvxPrice}
            changePercentage={cnvxChange.percentage}
            chartData={cnvxChartData}
          />

          <TokenCard
            symbol="BUN"
            icon={Zap}
            iconBgColor="bg-yellow-900 hover:scale-100 cursor-default"
            iconColor="text-yellow-400"
            price={bunPrice}
            changePercentage={bunChange.percentage}
            chartData={bunChartData}
          />

          <TokenCard
            symbol="VITE"
            icon={Sparkles}
            iconBgColor="bg-purple-900 hover:scale-100 cursor-default"
            iconColor="text-purple-400"
            price={vitePrice}
            changePercentage={viteChange.percentage}
            chartData={viteChartData}
          />

          <TokenCard
            symbol="SHAD"
            icon={Gem}
            iconBgColor="bg-indigo-900 hover:scale-100 cursor-default"
            iconColor="text-indigo-400"
            price={shadPrice}
            changePercentage={shadChange.percentage}
            chartData={shadChartData}
          />

          <Card className="col-span-2 row-span-2" />
          <TokenCard
            symbol="FLWR"
            icon={Flower2}
            iconBgColor="bg-pink-900 hover:scale-100 cursor-default"
            iconColor="text-pink-400"
            price={flwrPrice}
            changePercentage={flwrChange.percentage}
            chartData={flwrChartData}
          />
        </div>
      </main>
    </div>
  );
}
