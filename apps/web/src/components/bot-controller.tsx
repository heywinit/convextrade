"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";

// Component to automatically trigger bot trading
export function BotController() {
  const triggerBotTrading = useMutation((api as any).bots.triggerBotTrading);

  useEffect(() => {
    // Initialize bots on mount
    const initBots = async () => {
      try {
        // This will be called internally, but we can trigger bot trading
        await triggerBotTrading();
      } catch (error) {
        console.error("Bot trading error:", error);
      }
    };

    initBots();

    // Set up interval to trigger bot trading every 500ms for fast updates
    const interval = setInterval(() => {
      triggerBotTrading().catch((error) => {
        console.error("Bot trading error:", error);
      });
    }, 500); // 500ms for fast orderbook updates

    return () => clearInterval(interval);
  }, [triggerBotTrading]);

  return null; // This component doesn't render anything
}

