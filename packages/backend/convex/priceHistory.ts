import { query } from "./_generated/server";
import { v } from "convex/values";

// Get price history for chart - optimized
export const getPriceHistory = query({
  args: {
    token: v.optional(v.string()), // Token symbol, defaults to "CNVX" for backward compatibility
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const token = args.token ?? "CNVX"; // Default to CNVX for backward compatibility
    const limit = Math.min(args.limit ?? 100, 500); // Cap at 500 for performance
    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_token_timestamp", (q) => q.eq("token", token))
      .order("desc")
      .take(limit);

    // If no history exists, return a default entry
    if (history.length === 0) {
      return [
        {
          _id: "default" as any,
          _creationTime: Date.now(),
          token,
          price: 10.0,
          timestamp: Date.now(),
          volume: 0,
        },
      ];
    }

    // Reverse to get chronological order (oldest to newest)
    return history.reverse();
  },
});

