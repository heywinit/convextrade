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
      <BotController />
      <Navbar userId={userId} token={token} />
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column: Chart */}
          <div className="space-y-6">
            <Chart />
            <OrderForm userId={userId} />
          </div>

          {/* Right column: Orderbook */}
          <div className="space-y-6">
            <Orderbook />
            <OrderHistory userId={userId} />
          </div>
        </div>
      </main>
    </div>
  );
}
