import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { PRICE_HISTORY_LIMIT } from "./types";
import { calculatePriceChange, transformHistoryToChartData } from "./utils";

export function useTokenData(symbol: string) {
  const price = useQuery(api.orders.getCurrentPrice, { token: symbol });
  const history =
    useQuery(api.priceHistory.getPriceHistory, {
      token: symbol,
      limit: PRICE_HISTORY_LIMIT,
    }) ?? [];

  const chartData = useMemo(
    () => transformHistoryToChartData(history),
    [history],
  );

  const changePercentage = useMemo(
    () => calculatePriceChange(chartData, price ?? undefined),
    [chartData, price],
  );

  return {
    price: price ?? undefined,
    chartData,
    changePercentage,
  };
}
