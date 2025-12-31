import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

// Get orderbook (pending buy and sell orders)
export const getOrderbook = query({
  args: {},
  handler: async (ctx) => {
    const buyOrders = await ctx.db
      .query("orders")
      .withIndex("by_side_status", (q) => q.eq("side", "buy").eq("status", "pending"))
      .order("desc")
      .collect();

    const sellOrders = await ctx.db
      .query("orders")
      .withIndex("by_side_status", (q) => q.eq("side", "sell").eq("status", "pending"))
      .order("asc")
      .collect();

    // Sort buy orders by price descending (highest first)
    const sortedBuys = buyOrders.sort((a, b) => b.price - a.price);
    // Sort sell orders by price ascending (lowest first)
    const sortedSells = sellOrders.sort((a, b) => a.price - b.price);

    return {
      buys: sortedBuys,
      sells: sortedSells,
    };
  },
});

// Get current market price (last trade price or default)
export const getCurrentPrice = query({
  args: {},
  handler: async (ctx) => {
    const lastTrade = await ctx.db
      .query("trades")
      .withIndex("by_timestamp")
      .order("desc")
      .first();

    return lastTrade?.price ?? 10.0; // Default price of $10
  },
});

// Place a limit order
export const placeLimitOrder = mutation({
  args: {
    userId: v.id("users"),
    side: v.union(v.literal("buy"), v.literal("sell")),
    price: v.number(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        const errorMsg = "User not found";
        await ctx.db.insert("orders", {
          userId: args.userId,
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

      // Check if user has sufficient balance
      if (args.side === "buy") {
        const totalCost = args.price * args.quantity;
        if (user.balance < totalCost) {
          const errorMsg = `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${user.balance.toFixed(2)}`;
          await ctx.db.insert("orders", {
            userId: args.userId,
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
        // Sell order - check if user has enough CNVX
        if (user.cnvxAmount < args.quantity) {
          const errorMsg = `Insufficient CNVX. Required: ${args.quantity.toFixed(4)}, Available: ${user.cnvxAmount.toFixed(4)}`;
          await ctx.db.insert("orders", {
            userId: args.userId,
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
        // Reserve the CNVX
        await ctx.db.patch(args.userId, {
          cnvxAmount: user.cnvxAmount - args.quantity,
        });
      }

      // Create the order
      const orderId = await ctx.db.insert("orders", {
        userId: args.userId,
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
    } catch (error) {
      // Re-throw to let client handle it, but order is already saved as failed
      throw error;
    }
  },
});

// Place a market order
export const placeMarketOrder = mutation({
  args: {
    userId: v.id("users"),
    side: v.union(v.literal("buy"), v.literal("sell")),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        const errorMsg = "User not found";
        await ctx.db.insert("orders", {
          userId: args.userId,
          type: "market",
          side: args.side,
          price: 0,
          quantity: args.quantity,
          filledQuantity: 0,
          status: "failed",
          failureReason: errorMsg,
          createdAt: Date.now(),
        });
        throw new Error(errorMsg);
      }

      if (args.quantity <= 0) {
        const errorMsg = "Quantity must be positive";
        await ctx.db.insert("orders", {
          userId: args.userId,
          type: "market",
          side: args.side,
          price: 0,
          quantity: args.quantity,
          filledQuantity: 0,
          status: "failed",
          failureReason: errorMsg,
          createdAt: Date.now(),
        });
        throw new Error(errorMsg);
      }

      // Get current market price estimate from orderbook
      const orderbook = await ctx.db
        .query("orders")
        .withIndex("by_side_status", (q: any) =>
          q.eq("side", args.side === "buy" ? "sell" : "buy").eq("status", "pending"),
        )
        .collect();

      if (orderbook.length === 0) {
        const errorMsg = "No matching orders available in the orderbook";
        await ctx.db.insert("orders", {
          userId: args.userId,
          type: "market",
          side: args.side,
          price: 0,
          quantity: args.quantity,
          filledQuantity: 0,
          status: "failed",
          failureReason: errorMsg,
          createdAt: Date.now(),
        });
        throw new Error(errorMsg);
      }

      // For market buy, use highest sell price (worst case); for market sell, use lowest buy price (worst case)
      const matchingOrders =
        args.side === "buy"
          ? orderbook.sort((a: Doc<"orders">, b: Doc<"orders">) => b.price - a.price) // Highest price first for worst case
          : orderbook.sort((a: Doc<"orders">, b: Doc<"orders">) => a.price - b.price); // Lowest price first for worst case

      if (matchingOrders.length === 0) {
        const errorMsg = "No matching orders available";
        await ctx.db.insert("orders", {
          userId: args.userId,
          type: "market",
          side: args.side,
          price: 0,
          quantity: args.quantity,
          filledQuantity: 0,
          status: "failed",
          failureReason: errorMsg,
          createdAt: Date.now(),
        });
        throw new Error(errorMsg);
      }

      // Use worst-case price for reservation
      const worstCasePrice = matchingOrders[0].price;

      // Check if user has sufficient balance
      if (args.side === "buy") {
        const totalCost = worstCasePrice * args.quantity;
        if (user.balance < totalCost) {
          const errorMsg = `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${user.balance.toFixed(2)}`;
          await ctx.db.insert("orders", {
            userId: args.userId,
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
        // Reserve the funds (worst case)
        await ctx.db.patch(args.userId, {
          balance: user.balance - totalCost,
        });
      } else {
        if (user.cnvxAmount < args.quantity) {
          const errorMsg = `Insufficient CNVX. Required: ${args.quantity.toFixed(4)}, Available: ${user.cnvxAmount.toFixed(4)}`;
          await ctx.db.insert("orders", {
            userId: args.userId,
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
        await ctx.db.patch(args.userId, {
          cnvxAmount: user.cnvxAmount - args.quantity,
        });
      }

      // Create market order with worst-case price for reservation (actual price determined during matching)
      const orderId = await ctx.db.insert("orders", {
        userId: args.userId,
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
    } catch (error) {
      // Re-throw to let client handle it, but order is already saved as failed
      throw error;
    }
  },
});

// Internal mutation to match orders (used by bots)
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

  // Find matching orders
  const oppositeSide = newOrder.side === "buy" ? "sell" : "buy";
  const matchingOrders = await ctx.db
    .query("orders")
    .withIndex("by_side_status", (q: any) => q.eq("side", oppositeSide).eq("status", "pending"))
    .collect();

  // Sort matching orders by price
  // For market orders, accept any price; for limit orders, filter by price
  const sortedOrders =
    newOrder.type === "market"
      ? newOrder.side === "buy"
        ? matchingOrders.sort((a: Doc<"orders">, b: Doc<"orders">) => a.price - b.price) // Buy market: take lowest sell price
        : matchingOrders.sort((a: Doc<"orders">, b: Doc<"orders">) => b.price - a.price) // Sell market: take highest buy price
      : newOrder.side === "buy"
        ? matchingOrders.filter((o: Doc<"orders">) => o.price <= newOrder.price).sort((a: Doc<"orders">, b: Doc<"orders">) => a.price - b.price)
        : matchingOrders.filter((o: Doc<"orders">) => o.price >= newOrder.price).sort((a: Doc<"orders">, b: Doc<"orders">) => b.price - a.price);

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
  // Record the trade
  await ctx.db.insert("trades", {
    buyOrderId: order1.side === "buy" ? (order1._id as any) : (order2._id as any),
    sellOrderId: order1.side === "sell" ? (order1._id as any) : (order2._id as any),
    price,
    quantity,
    timestamp: Date.now(),
  });

  // Update price history
  await ctx.db.insert("priceHistory", {
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

  if (buyerUser) {
    // Buyer gets CNVX, pays USD
    const cost = price * quantity;
    const reservedCost = buyer.price * quantity; // What was originally reserved
    const refund = reservedCost - cost; // Refund difference for limit orders

    await ctx.db.patch(buyer.userId, {
      cnvxAmount: buyerUser.cnvxAmount + quantity,
      balance: buyerUser.balance + refund, // Refund unused portion
    });
  }

  if (sellerUser) {
    // Seller gets USD, gives CNVX
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

