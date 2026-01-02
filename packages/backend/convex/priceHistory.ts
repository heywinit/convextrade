import { query, internalMutation } from "./_generated/server";
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

// Migration: Backfill missing token field for existing priceHistory records
// This should be run once to fix existing records that don't have the token field
export const backfillPriceHistoryTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allHistory = await ctx.db.query("priceHistory").collect();
    let updated = 0;
    
    for (const record of allHistory) {
      // Check if token field is missing (undefined or null)
      if (!record.token) {
        await ctx.db.patch(record._id, {
          token: "CNVX", // Default to CNVX for backward compatibility
        });
        updated++;
      }
    }
    
    return { updated, total: allHistory.length };
  },
});

