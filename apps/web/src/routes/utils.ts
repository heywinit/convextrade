import { MIN_CHART_DATA_POINTS } from "./types";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculatePriceChange(
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

export function transformHistoryToChartData(
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

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
