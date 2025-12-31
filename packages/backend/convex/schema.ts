import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    balance: v.number(), // USD balance
    cnvxAmount: v.number(), // CNVX token amount
  }),

  orders: defineTable({
    userId: v.id("users"),
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
    .index("by_price", ["price"]),

  trades: defineTable({
    buyOrderId: v.id("orders"),
    sellOrderId: v.id("orders"),
    price: v.number(),
    quantity: v.number(),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"]),

  priceHistory: defineTable({
    price: v.number(),
    timestamp: v.number(),
    volume: v.number(),
  })
    .index("by_timestamp", ["timestamp"]),
});
