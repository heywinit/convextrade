import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    balance: v.number(), // USD balance
    tokenBalances: v.optional(v.any()), // Map of token -> amount (e.g., { "CNVX": 500, "ETH": 10 })
    cnvxAmount: v.number(), // CNVX token amount (kept for backward compatibility)
    isBot: v.optional(v.boolean()),
  })
    .index("by_username", ["username"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"]),

  orders: defineTable({
    userId: v.id("users"),
    token: v.string(), // Token symbol (e.g., "CNVX", "ETH", "BTC")
    type: v.union(v.literal("limit"), v.literal("market")),
    side: v.union(v.literal("buy"), v.literal("sell")),
    price: v.number(), // For limit orders, null for market orders
    quantity: v.number(),
    filledQuantity: v.number(),
    status: v.union(v.literal("pending"), v.literal("filled"), v.literal("cancelled"), v.literal("failed")),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"])
    .index("by_side_status", ["side", "status"])
    .index("by_price", ["price"])
    .index("by_token_side_status", ["token", "side", "status"]),

  trades: defineTable({
    buyOrderId: v.id("orders"),
    sellOrderId: v.id("orders"),
    token: v.string(), // Token symbol
    price: v.number(),
    quantity: v.number(),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_token_timestamp", ["token", "timestamp"]),

  priceHistory: defineTable({
    token: v.string(), // Token symbol
    price: v.number(),
    timestamp: v.number(),
    volume: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_token_timestamp", ["token", "timestamp"]),
});
