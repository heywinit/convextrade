import {
  Coins,
  Flower2,
  Gem,
  type LucideIcon,
  Sparkles,
  Zap,
} from "lucide-react";

// Token configuration
export type TokenConfig = {
  symbol: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
};

export const TOKENS: TokenConfig[] = [
  {
    symbol: "CNVX",
    icon: Coins,
    iconBgColor: "bg-blue-900 hover:scale-100 cursor-default",
    iconColor: "text-blue-400",
  },
  {
    symbol: "BUN",
    icon: Zap,
    iconBgColor: "bg-yellow-900 hover:scale-100 cursor-default",
    iconColor: "text-yellow-400",
  },
  {
    symbol: "VITE",
    icon: Sparkles,
    iconBgColor: "bg-purple-900 hover:scale-100 cursor-default",
    iconColor: "text-purple-400",
  },
  {
    symbol: "SHAD",
    icon: Gem,
    iconBgColor: "bg-indigo-900 hover:scale-100 cursor-default",
    iconColor: "text-indigo-400",
  },
  {
    symbol: "FLWR",
    icon: Flower2,
    iconBgColor: "bg-pink-900 hover:scale-100 cursor-default",
    iconColor: "text-pink-400",
  },
];

export type ViewMode = "tokens" | "bots" | "trades";

export const PRICE_HISTORY_LIMIT = 30;
export const MIN_CHART_DATA_POINTS = 2;
