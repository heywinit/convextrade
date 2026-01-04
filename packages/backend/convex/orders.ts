import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";

// Get orderbook (pending buy and sell orders) - optimized with pre-aggregation
export const getOrderbook = query({
  args: {
    token: v.optional(v.string()), // Token symbol, defaults to "CNVX" for backward compatibility
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const token = args.token ?? "CNVX"; // Default to CNVX for backward compatibility
    const limit = args.limit ?? 20; // Default to top 20 of each side

    // Fetch all pending orders for the specified token (using index for fast filtering)
    const buyOrders = await ctx.db
      .query("orders")
      .withIndex("by_token_side_status", (q) =>
        q.eq("token", token).eq("side", "buy").eq("status", "pending"),
      )
      .collect();

    const sellOrders = await ctx.db
      .query("orders")
      .withIndex("by_token_side_status", (q) =>
        q.eq("token", token).eq("side", "sell").eq("status", "pending"),
      )
      .collect();

    // Aggregate orders by price on server (much faster than client-side)
    const aggregateOrders = (orders: Doc<"orders">[]) => {
      const aggregated = new Map<number, number>();
      for (const order of orders) {
        const remaining = order.quantity - order.filledQuantity;
        if (remaining > 0) {
          aggregated.set(
            order.price,
            (aggregated.get(order.price) ?? 0) + remaining,
          );
        }
      }
      return Array.from(aggregated.entries())
        .map(([price, quantity]) => ({ price, quantity }))
        .sort((a, b) => b.price - a.price) // Highest first for buys
        .slice(0, limit);
    };

    // Sort and aggregate buys (highest price first)
    const aggregatedBuys = aggregateOrders(buyOrders);

    // Sort and aggregate sells (lowest price first, then reverse for display)
    const aggregatedSells = sellOrders.reduce((acc, order) => {
      const remaining = order.quantity - order.filledQuantity;
      if (remaining > 0) {
        acc.set(order.price, (acc.get(order.price) ?? 0) + remaining);
      }
      return acc;
    }, new Map<number, number>());

    const sortedSells = Array.from(aggregatedSells.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => a.price - b.price) // Lowest first
      .slice(0, limit);

    return {
      buys: aggregatedBuys,
      sells: sortedSells,
    };
  },
});

// Get current market price (last trade price or last price history entry)
export const getCurrentPrice = query({
  args: {
    token: v.optional(v.string()), // Token symbol, defaults to "CNVX" for backward compatibility
  },
  handler: async (ctx, args) => {
    const token = args.token ?? "CNVX"; // Default to CNVX for backward compatibility
    const lastTrade = await ctx.db
      .query("trades")
      .withIndex("by_token_timestamp", (q) => q.eq("token", token))
      .order("desc")
      .first();

    if (lastTrade) {
      return lastTrade.price;
    }

    // If no trades exist, try to get from price history
    const lastPriceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_token_timestamp", (q) => q.eq("token", token))
      .order("desc")
      .first();

    return lastPriceHistory?.price; // Return undefined if no price history exists
  },
});

// Place a limit order
export const placeLimitOrder = mutation({
  args: {
    userId: v.id("users"),
    token: v.optional(v.string()), // Token symbol, defaults to "CNVX" for backward compatibility
    side: v.union(v.literal("buy"), v.literal("sell")),
    price: v.number(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const token = args.token ?? "CNVX"; // Default to CNVX for backward compatibility
    const user = await ctx.db.get(args.userId);
    if (!user) {
      const errorMsg = "User not found";
      await ctx.db.insert("orders", {
        userId: args.userId,
        token,
        type: "limit",
        side: args.side,
        price: args.price,
        quantity: args.quantity,
        filledQuantity: 0,
        status: "failed",
        failureReason: errorMsg,
        createdAt: Date.now(),
      });
      throw new Error(errorMsg);
    }

    // Validate order
    if (args.price <= 0 || args.quantity <= 0) {
      const errorMsg = "Price and quantity must be positive";
      await ctx.db.insert("orders", {
        userId: args.userId,
        token,
        type: "limit",
        side: args.side,
        price: args.price,
        quantity: args.quantity,
        filledQuantity: 0,
        status: "failed",
        failureReason: errorMsg,
        createdAt: Date.now(),
      });
      throw new Error(errorMsg);
    }

    // Helper function to get token balance
    const getTokenBalance = (tokenSymbol: string): number => {
      if (tokenSymbol === "CNVX") {
        // Backward compatibility: use cnvxAmount if tokenBalances doesn't exist
        return (
          user.cnvxAmount ?? (user.tokenBalances as any)?.[tokenSymbol] ?? 0
        );
      }
      return (user.tokenBalances as any)?.[tokenSymbol] ?? 0;
    };

    // Helper function to update token balance
    const updateTokenBalance = async (tokenSymbol: string, amount: number) => {
      const currentBalances = (user.tokenBalances as any) ?? {};
      if (tokenSymbol === "CNVX") {
        // Update both cnvxAmount (backward compat) and tokenBalances
        await ctx.db.patch(args.userId, {
          cnvxAmount: amount,
          tokenBalances: { ...currentBalances, [tokenSymbol]: amount },
        });
      } else {
        await ctx.db.patch(args.userId, {
          tokenBalances: { ...currentBalances, [tokenSymbol]: amount },
        });
      }
    };

    // Check if user has sufficient balance
    if (args.side === "buy") {
      const totalCost = args.price * args.quantity;
      if (user.balance < totalCost) {
        const errorMsg = `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${user.balance.toFixed(2)}`;
        await ctx.db.insert("orders", {
          userId: args.userId,
          token,
          type: "limit",
          side: args.side,
          price: args.price,
          quantity: args.quantity,
          filledQuantity: 0,
          status: "failed",
          failureReason: errorMsg,
          createdAt: Date.now(),
        });
        throw new Error(errorMsg);
      }
      // Reserve the funds
      await ctx.db.patch(args.userId, {
        balance: user.balance - totalCost,
      });
    } else {
      // Sell order - check if user has enough tokens
      const tokenBalance = getTokenBalance(token);
      if (tokenBalance < args.quantity) {
        const errorMsg = `Insufficient ${token}. Required: ${args.quantity.toFixed(4)}, Available: ${tokenBalance.toFixed(4)}`;
        await ctx.db.insert("orders", {
          userId: args.userId,
          token,
          type: "limit",
          side: args.side,
          price: args.price,
          quantity: args.quantity,
          filledQuantity: 0,
          status: "failed",
          failureReason: errorMsg,
          createdAt: Date.now(),
        });
        throw new Error(errorMsg);
      }
      // Reserve the tokens
      await updateTokenBalance(token, tokenBalance - args.quantity);
    }

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      token,
      type: "limit",
      side: args.side,
      price: args.price,
      quantity: args.quantity,
      filledQuantity: 0,
      status: "pending",
      createdAt: Date.now(),
    });

    // Try to match the order
    await matchOrders(ctx, orderId);

    return orderId;
  },
});

// Place a market order
export const placeMarketOrder = mutation({
  args: {
    userId: v.id("users"),
    token: v.optional(v.string()), // Token symbol, defaults to "CNVX" for backward compatibility
    side: v.union(v.literal("buy"), v.literal("sell")),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const _token = args.token ?? "CNVX"; // Default to CNVX for backward compatibility
    const user = await ctx.db.get(args.userId);
    if (!user) {
      const _errorMsg = "User not found";
      await ctx.db.insert("orders", {
        userId: args.userId,
        token: _token,
        type: "market",
        side: args.side,
        price: 0,
        quantity: args.quantity,
        filledQuantity: 0,
        status: "failed",
        failureReason: _errorMsg,
        createdAt: Date.now(),
      });
      throw new Error(_errorMsg);
    }

    if (args.quantity <= 0) {
      const _errorMsg = "Quantity must be positive";
      await ctx.db.insert("orders", {
        userId: args.userId,
        token: _token,
        type: "market",
        side: args.side,
        price: 0,
        quantity: args.quantity,
        filledQuantity: 0,
        status: "failed",
        failureReason: _errorMsg,
        createdAt: Date.now(),
      });
      throw new Error(_errorMsg);
    }

    // Get current market price estimate from orderbook for the specific token
    const orderbook = await ctx.db
      .query("orders")
      .withIndex("by_token_side_status", (q: any) =>
        q
          .eq("token", _token)
          .eq("side", args.side === "buy" ? "sell" : "buy")
          .eq("status", "pending"),
      )
      .collect();

    if (orderbook.length === 0) {
      const _errorMsg = "No matching orders available in the orderbook";
      await ctx.db.insert("orders", {
        userId: args.userId,
        token: _token,
        type: "market",
        side: args.side,
        price: 0,
        quantity: args.quantity,
        filledQuantity: 0,
        status: "failed",
        failureReason: _errorMsg,
        createdAt: Date.now(),
      });
      throw new Error(_errorMsg);
    }

    // For market buy, use highest sell price (worst case); for market sell, use lowest buy price (worst case)
    const matchingOrders =
      args.side === "buy"
        ? orderbook.sort(
            (a: Doc<"orders">, b: Doc<"orders">) => b.price - a.price,
          ) // Highest price first for worst case
        : orderbook.sort(
            (a: Doc<"orders">, b: Doc<"orders">) => a.price - b.price,
          ); // Lowest price first for worst case

    if (matchingOrders.length === 0) {
      const _errorMsg = "No matching orders available";
      await ctx.db.insert("orders", {
        userId: args.userId,
        token: _token,
        type: "market",
        side: args.side,
        price: 0,
        quantity: args.quantity,
        filledQuantity: 0,
        status: "failed",
        failureReason: _errorMsg,
        createdAt: Date.now(),
      });
      throw new Error(_errorMsg);
    }

    // Use worst-case price for reservation
    const worstCasePrice = matchingOrders[0].price;

    // Helper function to get token balance
    const getTokenBalance = (tokenSymbol: string): number => {
      if (tokenSymbol === "CNVX") {
        return (
          user.cnvxAmount ?? (user.tokenBalances as any)?.[tokenSymbol] ?? 0
        );
      }
      return (user.tokenBalances as any)?.[tokenSymbol] ?? 0;
    };

    // Helper function to update token balance
    const updateTokenBalance = async (tokenSymbol: string, amount: number) => {
      const currentBalances = (user.tokenBalances as any) ?? {};
      if (tokenSymbol === "CNVX") {
        await ctx.db.patch(args.userId, {
          cnvxAmount: amount,
          tokenBalances: { ...currentBalances, [tokenSymbol]: amount },
        });
      } else {
        await ctx.db.patch(args.userId, {
          tokenBalances: { ...currentBalances, [tokenSymbol]: amount },
        });
      }
    };

    // Check if user has sufficient balance
    if (args.side === "buy") {
      const totalCost = worstCasePrice * args.quantity;
      if (user.balance < totalCost) {
        const _errorMsg = `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${user.balance.toFixed(2)}`;
        await ctx.db.insert("orders", {
          userId: args.userId,
          token: _token,
          type: "market",
          side: args.side,
          price: worstCasePrice,
          quantity: args.quantity,
          filledQuantity: 0,
          status: "failed",
          failureReason: _errorMsg,
          createdAt: Date.now(),
        });
        throw new Error(_errorMsg);
      }
      // Reserve the funds (worst case)
      await ctx.db.patch(args.userId, {
        balance: user.balance - totalCost,
      });
    } else {
      const tokenBalance = getTokenBalance(_token);
      if (tokenBalance < args.quantity) {
        const errorMsg = `Insufficient ${_token}. Required: ${args.quantity.toFixed(4)}, Available: ${tokenBalance.toFixed(4)}`;
        await ctx.db.insert("orders", {
          userId: args.userId,
          token: _token,
          type: "market",
          side: args.side,
          price: worstCasePrice,
          quantity: args.quantity,
          filledQuantity: 0,
          status: "failed",
          failureReason: errorMsg,
          createdAt: Date.now(),
        });
        throw new Error(errorMsg);
      }
      await updateTokenBalance(_token, tokenBalance - args.quantity);
    }

    // Create market order with worst-case price for reservation (actual price determined during matching)
    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      token: _token,
      type: "market",
      side: args.side,
      price: worstCasePrice, // Used for worst-case reservation
      quantity: args.quantity,
      filledQuantity: 0,
      status: "pending",
      createdAt: Date.now(),
    });

    // Try to match the order
    await matchOrders(ctx, orderId);

    return orderId;
  },
});

export const matchOrdersInternal = internalMutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    await matchOrders(ctx, args.orderId);
  },
});

// Match orders - this is called after placing a new order
async function matchOrders(ctx: any, newOrderId: string) {
  const newOrder = await ctx.db.get(newOrderId as any);
  if (!newOrder || newOrder.status !== "pending") {
    return;
  }

  // Find matching orders for the same token
  const oppositeSide = newOrder.side === "buy" ? "sell" : "buy";
  const orderToken = newOrder.token ?? "CNVX"; // Default to CNVX for backward compatibility
  const matchingOrders = await ctx.db
    .query("orders")
    .withIndex("by_token_side_status", (q: any) =>
      q
        .eq("token", orderToken)
        .eq("side", oppositeSide)
        .eq("status", "pending"),
    )
    .collect();

  // Sort matching orders by price
  // For market orders, accept any price; for limit orders, filter by price
  const sortedOrders =
    newOrder.type === "market"
      ? newOrder.side === "buy"
        ? matchingOrders.sort(
            (a: Doc<"orders">, b: Doc<"orders">) => a.price - b.price,
          ) // Buy market: take lowest sell price
        : matchingOrders.sort(
            (a: Doc<"orders">, b: Doc<"orders">) => b.price - a.price,
          ) // Sell market: take highest buy price
      : newOrder.side === "buy"
        ? matchingOrders
            .filter((o: Doc<"orders">) => o.price <= newOrder.price)
            .sort((a: Doc<"orders">, b: Doc<"orders">) => a.price - b.price)
        : matchingOrders
            .filter((o: Doc<"orders">) => o.price >= newOrder.price)
            .sort((a: Doc<"orders">, b: Doc<"orders">) => b.price - a.price);

  let remainingQuantity = newOrder.quantity - newOrder.filledQuantity;

  for (const matchOrder of sortedOrders) {
    if (remainingQuantity <= 0) break;

    const matchRemaining = matchOrder.quantity - matchOrder.filledQuantity;
    const tradeQuantity = Math.min(remainingQuantity, matchRemaining);
    const tradePrice = matchOrder.price; // Use the limit order's price

    // Execute the trade
    await executeTrade(ctx, newOrder, matchOrder, tradePrice, tradeQuantity);

    remainingQuantity -= tradeQuantity;
  }

  // Update new order status
  const updatedNewOrder = await ctx.db.get(newOrderId as any);
  if (updatedNewOrder) {
    if (updatedNewOrder.filledQuantity >= updatedNewOrder.quantity) {
      await ctx.db.patch(newOrderId as any, { status: "filled" });
    }
  }
}

// Execute a trade between two orders
async function executeTrade(
  ctx: any,
  order1: any,
  order2: any,
  price: number,
  quantity: number,
) {
  // Get token from either order, defaulting to "CNVX" for backward compatibility
  const token = order1.token ?? order2.token ?? "CNVX";

  // Record the trade
  await ctx.db.insert("trades", {
    buyOrderId:
      order1.side === "buy" ? (order1._id as any) : (order2._id as any),
    sellOrderId:
      order1.side === "sell" ? (order1._id as any) : (order2._id as any),
    token,
    price,
    quantity,
    timestamp: Date.now(),
  });

  // Update price history
  await ctx.db.insert("priceHistory", {
    token,
    price,
    timestamp: Date.now(),
    volume: quantity,
  });

  // Update orders
  const order1NewFilled = order1.filledQuantity + quantity;
  const order2NewFilled = order2.filledQuantity + quantity;

  await ctx.db.patch(order1._id as any, { filledQuantity: order1NewFilled });
  await ctx.db.patch(order2._id as any, { filledQuantity: order2NewFilled });

  if (order1NewFilled >= order1.quantity) {
    await ctx.db.patch(order1._id as any, { status: "filled" });
  }
  if (order2NewFilled >= order2.quantity) {
    await ctx.db.patch(order2._id as any, { status: "filled" });
  }

  // Update user balances
  const buyer = order1.side === "buy" ? order1 : order2;
  const seller = order1.side === "sell" ? order1 : order2;

  const buyerUser = await ctx.db.get(buyer.userId);
  const sellerUser = await ctx.db.get(seller.userId);

  // Helper function to get token balance
  const getTokenBalance = (user: any, tokenSymbol: string): number => {
    if (tokenSymbol === "CNVX") {
      return user.cnvxAmount ?? (user.tokenBalances as any)?.[tokenSymbol] ?? 0;
    }
    return (user.tokenBalances as any)?.[tokenSymbol] ?? 0;
  };

  // Helper function to update token balance
  const updateTokenBalance = async (
    userId: any,
    user: any,
    tokenSymbol: string,
    amount: number,
  ) => {
    const currentBalances = (user.tokenBalances as any) ?? {};
    if (tokenSymbol === "CNVX") {
      await ctx.db.patch(userId, {
        cnvxAmount: amount,
        tokenBalances: { ...currentBalances, [tokenSymbol]: amount },
      });
    } else {
      await ctx.db.patch(userId, {
        tokenBalances: { ...currentBalances, [tokenSymbol]: amount },
      });
    }
  };

  if (buyerUser) {
    // Buyer gets tokens, pays USD
    const cost = price * quantity;
    const reservedCost = buyer.price * quantity; // What was originally reserved
    const refund = reservedCost - cost; // Refund difference for limit orders

    const currentTokenBalance = getTokenBalance(buyerUser, token);
    await updateTokenBalance(
      buyer.userId,
      buyerUser,
      token,
      currentTokenBalance + quantity,
    );
    await ctx.db.patch(buyer.userId, {
      balance: buyerUser.balance + refund, // Refund unused portion
    });
  }

  if (sellerUser) {
    // Seller gets USD, gives tokens
    const revenue = price * quantity;
    await ctx.db.patch(seller.userId, {
      balance: sellerUser.balance + revenue,
    });
  }
}

// Get user's open orders
export const getUserOrders = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .filter((q: any) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();
  },
});

// Get user's order history (all orders including failed)
export const getUserOrderHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .take(50); // Last 50 orders
  },
});

// Get all recent trades for the trades feed
export const getRecentTrades = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100; // Default to 100 most recent trades
    return await ctx.db
      .query("trades")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// Migration: Backfill missing token field for existing orders
// This should be run once to fix existing orders that don't have the token field
export const backfillOrderTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    let updated = 0;

    for (const order of orders) {
      // Check if token field is missing (undefined or null)
      if (!order.token) {
        await ctx.db.patch(order._id, {
          token: "CNVX", // Default to CNVX for backward compatibility
        });
        updated++;
      }
    }

    return { updated, total: orders.length };
  },
});

// Migration: Backfill missing token field for existing trades
// This should be run once to fix existing trades that don't have the token field
export const backfillTradeTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const trades = await ctx.db.query("trades").collect();
    let updated = 0;

    for (const trade of trades) {
      // Check if token field is missing (undefined or null)
      if (!trade.token) {
        // Try to get token from the buy order first, then sell order, then default to CNVX
        const buyOrder = await ctx.db.get(trade.buyOrderId);
        const sellOrder = await ctx.db.get(trade.sellOrderId);
        const token = buyOrder?.token ?? sellOrder?.token ?? "CNVX";

        await ctx.db.patch(trade._id, {
          token, // Use token from associated order, or default to CNVX
        });
        updated++;
      }
    }

    return { updated, total: trades.length };
  },
});
