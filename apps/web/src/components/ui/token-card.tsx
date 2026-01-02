import type { LucideIcon } from "lucide-react";
import { Expand } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

interface TokenCardProps {
  symbol: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  price: number;
  changePercentage: number;
  chartData: Array<{ timestamp: number; price: number }>;
  className?: string;
}

export function TokenCard({
  symbol,
  icon: Icon,
  iconBgColor = "bg-blue-900 hover:scale-100 cursor-default",
  iconColor = "text-blue-400",
  price,
  changePercentage,
  chartData,
  className,
}: TokenCardProps) {
  const isPositive = changePercentage >= 0;
  const chartColor = isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)";

  // Format chart data for recharts
  const formattedData = chartData.map((item) => ({
    timestamp: item.timestamp,
    value: item.price,
  }));

  // Ensure we have at least 2 data points (charts need at least 2 points to render)
  // If we have less than 2 points, generate sample data with variation
  const hasEnoughData = formattedData.length >= 2;
  const displayData = hasEnoughData
    ? formattedData
    : Array.from({ length: 20 }, (_, i) => ({
        value: price * (1 + Math.sin(i / 3) * 0.1),
      }));

  return (
    <Card
      className={cn(
        "relative min-h-[200px] overflow-hidden py-0 pt-4 pb-0",
        className,
      )}
    >
      <CardHeader className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconButton icon={Icon} bgColor={iconBgColor} iconColor={iconColor} />
          <CardTitle className="text-base">
            <h1>{symbol}/USD</h1>
          </CardTitle>
        </div>
        <IconButton
          icon={Expand}
          bgColor="bg-card"
          iconColor="text-muted-foreground"
        />
      </CardHeader>
      <CardContent className="relative z-10 min-h-[140px] pb-0">
        <div className="flex items-center gap-2">
          <div className="pb-2 font-bold text-4xl">${price.toFixed(2)}</div>
          <div
            className={cn(
              "rounded-full px-3 py-1 font-medium text-xs",
              isPositive
                ? "bg-green-500/20 text-green-500"
                : "bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400",
            )}
          >
            {isPositive ? "+" : ""}
            {changePercentage.toFixed(2)}%
          </div>
        </div>
        {/* Background chart */}
        <div
          className="pointer-events-none absolute right-0 bottom-0 left-0 z-0 overflow-hidden"
          style={{ height: "60px" }}
        >
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayData}
                margin={{
                  left: 0,
                  right: 0,
                  top: -5,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id={`gradient-${symbol}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={chartColor}
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="100%"
                      stopColor={chartColor}
                      stopOpacity={0.15}
                    />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="value"
                  fill={`url(#gradient-${symbol})`}
                  stroke={chartColor}
                  strokeWidth={4}
                  type="monotone"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
