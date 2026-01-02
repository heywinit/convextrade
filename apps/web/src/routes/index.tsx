import { api } from "@convextrade/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ChartBarIcon, Expand } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

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
  const [_userId, setUserId] = useState<string | null>(null);
  const [_deviceId, setDeviceId] = useState<string>("");
  const getOrCreateUser = useMutation(api.auth.getOrCreateUserByDeviceId);

  // Example profit data - replace with actual data from your API
  const profit = 123;
  const profitPercentage = 12.5; // Example: 12.5% profit
  const isProfit = profitPercentage >= 0;

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
      <main className="w-full max-w-6xl">
        <div className="mx-auto grid max-w-2xl grid-cols-3 grid-rows-2 gap-4">
          <Card className="py-0 pt-4 pb-2">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconButton
                  icon={ChartBarIcon}
                  bgColor="bg-green-900 hover:scale-100 cursor-default"
                  iconColor="text-green-400"
                />
                <CardTitle>
                  <h1>Profit & Loss</h1>
                </CardTitle>
              </div>
              <IconButton
                icon={Expand}
                bgColor="bg-card"
                iconColor="text-green-600"
              />
            </CardHeader>
            <CardContent className="relative pb-0">
              <div className="pb-2 font-bold text-4xl">${profit}</div>
              <div
                className={cn(
                  "absolute right-2 bottom-0 rounded-full px-3 py-1 font-medium text-sm",
                  isProfit
                    ? "bg-green-500/20 text-green-500"
                    : "bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400",
                )}
              >
                {isProfit ? "+" : ""}
                {profitPercentage.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
