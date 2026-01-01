"use client";

import { useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function Chart({ token }: { token: string }) {
  const priceHistory = useQuery((api as any).priceHistory.getPriceHistory, { token, limit: 100 });

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Price Chart</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for recharts
  const chartData = priceHistory.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    price: Number(point.price.toFixed(2)),
    timestamp: point.timestamp,
  }));

  const currentPrice = priceHistory[priceHistory.length - 1]?.price ?? 10.0;
  const priceChange =
    priceHistory.length > 1 ? currentPrice - priceHistory[0].price : 0;
  const priceChangePercent =
    priceHistory.length > 1
      ? ((priceChange / priceHistory[0].price) * 100).toFixed(2)
      : "0.00";

  const isPositive = priceChange >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Price Chart</CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">${currentPrice.toFixed(2)}</div>
              <div
                className={`text-xs ${
                  isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {isPositive ? "+" : ""}
                {priceChangePercent}%
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(var(--border))"
                opacity={0.2}
              />
              <XAxis
                dataKey="time"
                stroke="oklch(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "oklch(var(--muted-foreground))" }}
              />
              <YAxis
                stroke="oklch(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                tick={{ fill: "oklch(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(var(--card))",
                  border: "1px solid oklch(var(--border))",
                  borderRadius: "6px",
                }}
                labelStyle={{ color: "oklch(var(--foreground))" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                strokeWidth={2}
                fill="url(#colorPrice)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

