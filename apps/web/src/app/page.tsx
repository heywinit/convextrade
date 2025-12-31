"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Navbar } from "@/components/navbar";
import { Chart } from "@/components/chart";
import { Orderbook } from "@/components/orderbook";
import { OrderForm } from "@/components/order-form";
import { OrderHistory } from "@/components/order-history";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  useEffect(() => {
    // Initialize user on mount
    getOrCreateUser()
      .then((user) => {
        if (user) {
          setUserId(user._id as string);
        }
      })
      .catch((error) => {
        console.error("Failed to initialize user:", error);
      });
  }, [getOrCreateUser]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar userId={userId} />
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
