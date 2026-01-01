"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";

// Component to automatically trigger bot trading
export function BotController({ tokens }: { tokens: string[] }) {
  const triggerBotTrading = useMutation((api as any).bots.triggerBotTrading);

  useEffect(() => {
    // Initialize bots on mount
    const initBots = async () => {
      try {
        // Trigger bot trading for all tokens
        for (const token of tokens) {
          await triggerBotTrading({ token });
        }
      } catch (error) {
        console.error("Bot trading error:", error);
      }
    };

    initBots();

    // Set up interval to trigger bot trading every 500ms for fast updates
    const interval = setInterval(() => {
      for (const token of tokens) {
        triggerBotTrading({ token }).catch((error) => {
          console.error(`Bot trading error for ${token}:`, error);
        });
      }
    }, 500); // 500ms for fast orderbook updates

    return () => clearInterval(interval);
  }, [triggerBotTrading, tokens]);

  return null; // This component doesn't render anything
}

