import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

// Initialize bot users (5 bots)
export const initializeBots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const botNames = [
      "BotAlpha",
      "BotBeta",
      "BotGamma",
      "BotDelta",
      "BotEpsilon",
    ];
    const bots = [];

    for (const name of botNames) {
      // Check if bot already exists
      const existing = await ctx.db
        .query("users")
        .withIndex("by_username", (q: any) => q.eq("username", name))
        .first();

      if (!existing) {
        const botId = await ctx.db.insert("users", {
          username: name,
          balance: 1000, // Bots start with more capital
          cnvxAmount: 1000, // And more CNVX
          isBot: true,
        });
        bots.push(botId);
      } else {
        bots.push(existing._id);
      }
    }

    return bots;
  },
});

// Get all bot users
export const getBots = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("isBot"), true))
      .collect();
  },
});

// Smart bot trading logic
export const botTrade = internalMutation({
  args: {
    botId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const bot = await ctx.db.get(args.botId);
    if (!bot || !bot.isBot) {
      return { success: false, reason: "Not a bot" };
    }

    // Get current market price
    const lastTrade = await ctx.db
      .query("trades")
      .withIndex("by_timestamp")
      .order("desc")
      .first();
    const currentPrice = lastTrade?.price ?? 10.0;

    // Get orderbook to understand market depth
    const buyOrders = await ctx.db
      .query("orders")
      .withIndex("by_side_status", (q: any) =>
        q.eq("side", "buy").eq("status", "pending"),
      )
      .collect();
    const sellOrders = await ctx.db
      .query("orders")
      .withIndex("by_side_status", (q: any) =>
        q.eq("side", "sell").eq("status", "pending"),
      )
      .collect();

    const sortedBuys = buyOrders.sort((a: any, b: any) => b.price - a.price);
    const sortedSells = sellOrders.sort((a: any, b: any) => a.price - b.price);

    const bestBid = sortedBuys[0]?.price ?? currentPrice * 0.995;
    const bestAsk = sortedSells[0]?.price ?? currentPrice * 1.005;
    const _spread = bestAsk - bestBid;
    const _midPrice = (bestBid + bestAsk) / 2 || currentPrice;

    // Bot trading strategy for natural orderbook:
    // 1. Place orders near best bid/ask to create tight spread
    // 2. Use small price increments ($0.01-$0.05)
    // 3. Compete to be at the top of the book
    // 4. Add depth at various price levels

    const action = Math.random();

    try {
      if (action < 0.4) {
        // 40% chance: Place limit buy order (if we have balance)
        if (bot.balance > 50) {
          let price: number;

          // If there's a best bid, place order slightly above it (to compete) or at it
          if (bestBid && bestBid > currentPrice * 0.9) {
            // 60% chance to beat the best bid, 40% chance to match it
            if (Math.random() < 0.6) {
              // Beat the best bid by $0.01-$0.05
              price = bestBid + 0.01 + Math.random() * 0.04;
            } else {
              // Match the best bid
              price = bestBid;
            }
          } else {
            // No existing bids, place near current price
            price = currentPrice * (0.995 + Math.random() * 0.01); // 99.5-100.5% of current
          }

          // Round to 2 decimal places
          price = Math.round(price * 100) / 100;

          // Ensure price doesn't exceed best ask (would match immediately)
          if (bestAsk && price >= bestAsk) {
            price = bestAsk - 0.01;
          }

          const quantity = 0.5 + Math.random() * 2; // 0.5 to 2.5 CNVX
          const totalCost = price * quantity;

          if (bot.balance >= totalCost) {
            await ctx.db.patch(args.botId, {
              balance: bot.balance - totalCost,
            });

            const orderId = await ctx.db.insert("orders", {
              userId: args.botId,
              type: "limit",
              side: "buy",
              price: price,
              quantity: Math.round(quantity * 10000) / 10000, // Round to 4 decimals
              filledQuantity: 0,
              status: "pending",
              createdAt: Date.now(),
            });

            // Try to match immediately
            await ctx.runMutation(internal.orders.matchOrdersInternal, {
              orderId,
            });

            return { success: true, action: "limit_buy", price, quantity };
          }
        }
      } else if (action < 0.8) {
        // 40% chance: Place limit sell order (if we have CNVX)
        if (bot.cnvxAmount > 0.5) {
          let price: number;

          // If there's a best ask, place order slightly below it (to compete) or at it
          if (bestAsk && bestAsk < currentPrice * 1.1) {
            // 60% chance to beat the best ask, 40% chance to match it
            if (Math.random() < 0.6) {
              // Beat the best ask by $0.01-$0.05
              price = bestAsk - 0.01 - Math.random() * 0.04;
            } else {
              // Match the best ask
              price = bestAsk;
            }
          } else {
            // No existing asks, place near current price
            price = currentPrice * (1.0 + Math.random() * 0.01); // 100-101% of current
          }

          // Round to 2 decimal places
          price = Math.round(price * 100) / 100;

          // Ensure price doesn't go below best bid (would match immediately)
          if (bestBid && price <= bestBid) {
            price = bestBid + 0.01;
          }

          const quantity = 0.5 + Math.random() * 2; // 0.5 to 2.5 CNVX

          if (bot.cnvxAmount >= quantity) {
            await ctx.db.patch(args.botId, {
              cnvxAmount: bot.cnvxAmount - quantity,
            });

            const orderId = await ctx.db.insert("orders", {
              userId: args.botId,
              type: "limit",
              side: "sell",
              price: price,
              quantity: Math.round(quantity * 10000) / 10000,
              filledQuantity: 0,
              status: "pending",
              createdAt: Date.now(),
            });

            // Try to match immediately
            await ctx.runMutation(internal.orders.matchOrdersInternal, {
              orderId,
            });

            return { success: true, action: "limit_sell", price, quantity };
          }
        }
      } else {
        // 20% chance: Place market order for activity
        if (action < 0.9 && bot.balance > 50 && sortedSells.length > 0) {
          // Market buy
          const quantity = 0.3 + Math.random() * 0.7; // 0.3 to 1.0 CNVX
          const estimatedPrice = sortedSells[0].price;
          const totalCost = estimatedPrice * quantity;

          if (bot.balance >= totalCost) {
            await ctx.db.patch(args.botId, {
              balance: bot.balance - totalCost,
            });

            const orderId = await ctx.db.insert("orders", {
              userId: args.botId,
              type: "market",
              side: "buy",
              price: estimatedPrice,
              quantity: Math.round(quantity * 10000) / 10000,
              filledQuantity: 0,
              status: "pending",
              createdAt: Date.now(),
            });

            await ctx.runMutation(internal.orders.matchOrdersInternal, {
              orderId,
            });

            return { success: true, action: "market_buy", quantity };
          }
        } else if (bot.cnvxAmount > 0.3 && sortedBuys.length > 0) {
          // Market sell
          const quantity = 0.3 + Math.random() * 0.7; // 0.3 to 1.0 CNVX

          if (bot.cnvxAmount >= quantity) {
            await ctx.db.patch(args.botId, {
              cnvxAmount: bot.cnvxAmount - quantity,
            });

            const orderId = await ctx.db.insert("orders", {
              userId: args.botId,
              type: "market",
              side: "sell",
              price: sortedBuys[0].price,
              quantity: Math.round(quantity * 10000) / 10000,
              filledQuantity: 0,
              status: "pending",
              createdAt: Date.now(),
            });

            await ctx.runMutation(internal.orders.matchOrdersInternal, {
              orderId,
            });

            return { success: true, action: "market_sell", quantity };
          }
        }
      }

      return { success: false, reason: "Insufficient balance or CNVX" };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Run bot trading for all bots
export const runBotTrading = internalMutation({
  args: {},
  handler: async (ctx): Promise<Array<{ botId: any; result: any }>> => {
    const bots = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("isBot"), true))
      .collect();

    const results: Array<{ botId: any; result: any }> = [];
    for (const bot of bots) {
      // Each bot has a 30% chance to trade on each run (since we're running every 500ms)
      // This keeps activity high but not overwhelming
      if (Math.random() < 0.3) {
        const result: any = await ctx.runMutation(internal.bots.botTrade, {
          botId: bot._id,
        });
        results.push({ botId: bot._id, result });
      }
    }

    return results;
  },
});

// Public mutation to trigger bot trading (can be called from frontend or scheduled)
export const triggerBotTrading = mutation({
  args: {},
  handler: async (ctx): Promise<Array<{ botId: any; result: any }>> => {
    // Initialize bots if they don't exist
    await ctx.runMutation(internal.bots.initializeBots, {});
    // Run bot trading
    return await ctx.runMutation(internal.bots.runBotTrading, {});
  },
});
