import { query } from "./_generated/server";
import { v } from "convex/values";

// Get price history for chart
export const getPriceHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    // If no history exists, return a default entry
    if (history.length === 0) {
      return [
        {
          _id: "default" as any,
          _creationTime: Date.now(),
          price: 10.0,
          timestamp: Date.now(),
          volume: 0,
        },
      ];
    }

    // Reverse to get chronological order
    return history.reverse();
  },
});

