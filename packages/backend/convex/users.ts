import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create user with initial $100 balance
export const getOrCreateUser = mutation({
  args: {},
  handler: async (ctx) => {
    // For simplicity, we'll use a single user per session
    // In production, you'd use authentication
    const existingUser = await ctx.db.query("users").order("desc").first();

    if (existingUser) {
      return existingUser;
    }

    // Create new user with $100 and 500 CNVX
    const userId = await ctx.db.insert("users", {
      balance: 100,
      cnvxAmount: 500,
    });

    return await ctx.db.get(userId);
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
