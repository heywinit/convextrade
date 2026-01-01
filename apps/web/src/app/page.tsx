"use client";

import { api } from "@convextrade/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { BotController } from "@/components/bot-controller";
import { Chart } from "@/components/chart";
import { Navbar } from "@/components/navbar";
import { OrderForm } from "@/components/order-form";
import { OrderHistory } from "@/components/order-history";
import { Orderbook } from "@/components/orderbook";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string>("CNVX");
  
  // Available tokens to trade
  const availableTokens = ["CNVX", "BUN", "NEXT", "SHAD"];

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Get current user from token
  const currentUser = useQuery(
    (api as any).auth.getCurrentUser,
    token ? { token } : "skip",
  );

  useEffect(() => {
    if (currentUser) {
      setUserId(currentUser._id);
    } else if (token && currentUser === null) {
      // Token is invalid or expired
      localStorage.removeItem("authToken");
      setToken(null);
      setUserId(null);
    }
  }, [currentUser, token]);

  const handleAuthSuccess = (newUserId: string, newToken: string) => {
    setUserId(newUserId);
    setToken(newToken);
    localStorage.setItem("authToken", newToken);
  };

  // Show auth form if not authenticated
  if (!token || !userId) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* BotController removed - bots now run server-side via scheduled actions */}
      <Navbar userId={userId} token={token} />
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6 flex items-center gap-4">
          <label htmlFor="token-select" className="text-sm font-medium">
            Select Token:
          </label>
          <select
            id="token-select"
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {availableTokens.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column: Chart */}
          <div className="space-y-6">
            <Chart token={selectedToken} />
            <OrderForm userId={userId} token={selectedToken} />
          </div>

          {/* Right column: Orderbook */}
          <div className="space-y-6">
            <Orderbook token={selectedToken} />
            <OrderHistory userId={userId} />
          </div>
        </div>
      </main>
    </div>
  );
}
