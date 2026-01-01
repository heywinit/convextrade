import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Start the bot trading loop once per minute (it will self-schedule every 500ms after that)
// This ensures the loop is always running even if it stops for some reason
crons.interval(
  "ensure-bot-trading-loop",
  {
    minutes: 1,
  },
  internal.bots.runBotTradingForAllTokens,
);

export default crons;

