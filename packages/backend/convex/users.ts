import { v } from "convex/values";
import { query } from "./_generated/server";

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by deviceId
export const getUserByDeviceId = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (!user) {
      return null;
    }

    // Return user without password hash
    return {
      _id: user._id,
      username: user.username,
      balance: user.balance,
      cnvxAmount: user.cnvxAmount,
      tokenBalances: user.tokenBalances,
    };
  },
});
