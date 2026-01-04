import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

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

    // Reverse to get chronological order (oldest to newest)
    return history.reverse();
  },
});

// Initialize price history with default prices for all tokens
// This ensures prices are available immediately without waiting for trades
export const initializePriceHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const tokens = [
      { symbol: "CNVX", price: 10.0 },
      { symbol: "BUN", price: 5.0 },
      { symbol: "VITE", price: 15.0 },
      { symbol: "SHAD", price: 8.0 },
      { symbol: "FLWR", price: 12.0 },
    ];

    const now = Date.now();
    let initialized = 0;

    for (const token of tokens) {
      // Check if price history already exists for this token
      const existing = await ctx.db
        .query("priceHistory")
        .withIndex("by_token_timestamp", (q) => q.eq("token", token.symbol))
        .first();

      // Only initialize if no history exists
      if (!existing) {
        await ctx.db.insert("priceHistory", {
          token: token.symbol,
          price: token.price,
          timestamp: now,
          volume: 0,
        });
        initialized++;
      }
    }

    return { initialized, total: tokens.length };
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
