import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";

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
          balance: 1000, // Bots start with $1000 USD
          cnvxAmount: 0, // Start with 0 tokens
          tokenBalances: { CNVX: 0, BUN: 0, NEXT: 0, SHAD: 0 }, // Start with 0 of each token
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
    token: v.optional(v.string()), // Token symbol, defaults to "CNVX"
  },
  handler: async (ctx, args) => {
    const token = args.token ?? "CNVX"; // Default to CNVX
    const bot = await ctx.db.get(args.botId);
    if (!bot || !bot.isBot) {
      return { success: false, reason: "Not a bot" };
    }

    // Get current market price for the token
    const lastTrade = await ctx.db
      .query("trades")
      .withIndex("by_token_timestamp", (q: any) => q.eq("token", token))
      .order("desc")
      .first();
    const currentPrice = lastTrade?.price ?? 10.0;

    // Get orderbook to understand market depth for the token
    const buyOrders = await ctx.db
      .query("orders")
      .withIndex("by_token_side_status", (q: any) =>
        q.eq("token", token).eq("side", "buy").eq("status", "pending"),
      )
      .collect();
    const sellOrders = await ctx.db
      .query("orders")
      .withIndex("by_token_side_status", (q: any) =>
        q.eq("token", token).eq("side", "sell").eq("status", "pending"),
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

    // Helper function to get token balance
    const getTokenBalance = (tokenSymbol: string): number => {
      if (tokenSymbol === "CNVX") {
        return bot.cnvxAmount ?? (bot.tokenBalances as any)?.[tokenSymbol] ?? 0;
      }
      return (bot.tokenBalances as any)?.[tokenSymbol] ?? 0;
    };

    // Helper function to update token balance
    const updateTokenBalance = async (tokenSymbol: string, amount: number) => {
      const currentBalances = (bot.tokenBalances as any) ?? {};
      if (tokenSymbol === "CNVX") {
        await ctx.db.patch(args.botId, {
          cnvxAmount: amount,
          tokenBalances: { ...currentBalances, [tokenSymbol]: amount },
        });
      } else {
        await ctx.db.patch(args.botId, {
          tokenBalances: { ...currentBalances, [tokenSymbol]: amount },
        });
      }
    };

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

          const quantity = 0.5 + Math.random() * 2; // 0.5 to 2.5 tokens
          const totalCost = price * quantity;

          if (bot.balance >= totalCost) {
            await ctx.db.patch(args.botId, {
              balance: bot.balance - totalCost,
            });

            const orderId = await ctx.db.insert("orders", {
              userId: args.botId,
              token,
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
        // 40% chance: Place limit sell order (if we have tokens)
        const tokenBalance = getTokenBalance(token);
        if (tokenBalance > 0.5) {
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

          const quantity = 0.5 + Math.random() * 2; // 0.5 to 2.5 tokens

          if (tokenBalance >= quantity) {
            await updateTokenBalance(token, tokenBalance - quantity);

            const orderId = await ctx.db.insert("orders", {
              userId: args.botId,
              token,
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
          const quantity = 0.3 + Math.random() * 0.7; // 0.3 to 1.0 tokens
          const estimatedPrice = sortedSells[0].price;
          const totalCost = estimatedPrice * quantity;

          if (bot.balance >= totalCost) {
            await ctx.db.patch(args.botId, {
              balance: bot.balance - totalCost,
            });

            const orderId = await ctx.db.insert("orders", {
              userId: args.botId,
              token,
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
        } else {
          const tokenBalance = getTokenBalance(token);
          if (tokenBalance > 0.3 && sortedBuys.length > 0) {
            // Market sell
            const quantity = 0.3 + Math.random() * 0.7; // 0.3 to 1.0 tokens

            if (tokenBalance >= quantity) {
              await updateTokenBalance(token, tokenBalance - quantity);

              const orderId = await ctx.db.insert("orders", {
                userId: args.botId,
                token,
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
  args: {
    token: v.optional(v.string()), // Token symbol, defaults to "CNVX"
  },
  handler: async (ctx, args): Promise<Array<{ botId: any; result: any }>> => {
    const token = args.token ?? "CNVX"; // Default to CNVX
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
          token,
        });
        results.push({ botId: bot._id, result });
      }
    }

    return results;
  },
});

// Public mutation to trigger bot trading (kept for manual triggering if needed)
export const triggerBotTrading = mutation({
  args: {
    token: v.optional(v.string()), // Token symbol, defaults to "CNVX"
  },
  handler: async (ctx, args): Promise<Array<{ botId: any; result: any }>> => {
    const token = args.token ?? "CNVX"; // Default to CNVX
    // Initialize bots if they don't exist
    await ctx.runMutation(internal.bots.initializeBots, {});
    // Run bot trading for the specified token
    return await ctx.runMutation(internal.bots.runBotTrading, { token });
  },
});

// Self-scheduling action that runs bot trading continuously
// This runs server-side and doesn't require frontend polling
// Once started, it schedules itself to run again every 500ms
export const runBotTradingForAllTokens = internalAction({
  args: {},
  handler: async (ctx) => {
    const tokens = ["CNVX", "BUN", "NEXT", "SHAD"];
    
    // Initialize bots if they don't exist
    await ctx.runMutation(internal.bots.initializeBots, {});
    
    // Run bot trading for all tokens
    for (const token of tokens) {
      await ctx.runMutation(internal.bots.runBotTrading, { token });
    }
    
    await ctx.scheduler.runAfter(500, internal.bots.runBotTradingForAllTokens, {});
  },
});

// Public mutation to manually start the bot trading loop (optional)
// The cron job will also start it automatically
export const startBotTradingLoop = mutation({
  args: {},
  handler: async (ctx) => {
    // Initialize bots if they don't exist
    await ctx.runMutation(internal.bots.initializeBots, {});
    // Start the self-scheduling loop
    await ctx.scheduler.runAfter(0, internal.bots.runBotTradingForAllTokens, {});
    return { success: true, message: "Bot trading loop started" };
  },
});
