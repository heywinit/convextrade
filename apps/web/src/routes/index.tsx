import { api } from "@convextrade/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Activity, Bot, Coins, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTokenData } from "./hooks";
import type { ViewMode } from "./types";
import { formatCurrency, getOrCreateDeviceId } from "./utils";
import { BotsView } from "./views/bots-view";
import { TokensView } from "./views/tokens-view";
import { TradesView } from "./views/trades-view";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

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

  // View mode buttons configuration
  const viewModeButtons: Array<{
    mode: ViewMode;
    icon: LucideIcon;
    title: string;
  }> = [
    { mode: "tokens", icon: Coins, title: "View Tokens" },
    { mode: "bots", icon: Bot, title: "View Bots" },
    { mode: "trades", icon: Activity, title: "View Trades" },
  ];

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
          {viewMode === "tokens" && <TokensView tokenDataMap={tokenDataMap} />}
          {viewMode === "bots" && <BotsView tokenDataMap={tokenDataMap} />}
          {viewMode === "trades" && <TradesView />}
        </div>
        <div className="flex items-center justify-end gap-2 rounded-b-4xl">
          <div className="w-min rounded-b-3xl border-4 border-card border-t-0 p-2">
            <div className="flex gap-2">
              {viewModeButtons.map(({ mode, icon: Icon, title }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "outline"}
                  className="rounded-full"
                  size="icon"
                  onClick={() => setViewMode(mode)}
                  title={title}
                >
                  <Icon />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
