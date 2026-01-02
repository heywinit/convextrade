import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate a random token
function generateToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
}

// Register a new user
export const register = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate username
    if (args.username.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }
    if (args.username.length > 20) {
      throw new Error("Username must be less than 20 characters");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(args.username)) {
      throw new Error(
        "Username can only contain letters, numbers, and underscores",
      );
    }

    // Validate password
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Check if username already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q: any) => q.eq("username", args.username))
      .first();

    if (existingUser) {
      throw new Error("Username already taken");
    }

    // Hash password
    const passwordHash = await hashPassword(args.password);

    // Create user with initial $1000 USD and 0 of each token
    const userId = await ctx.db.insert("users", {
      username: args.username,
      passwordHash,
      balance: 1000,
      cnvxAmount: 0,
      tokenBalances: { CNVX: 0, BUN: 0, NEXT: 0, SHAD: 0 },
    });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
    });

    return { userId, token };
  },
});

// Login or Register - single function that tries login first, then creates account if user doesn't exist
export const loginOrRegister = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate username
    if (args.username.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }
    if (args.username.length > 20) {
      throw new Error("Username must be less than 20 characters");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(args.username)) {
      throw new Error(
        "Username can only contain letters, numbers, and underscores",
      );
    }

    // Validate password
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Try to find existing user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q: any) => q.eq("username", args.username))
      .first();

    if (existingUser) {
      // User exists - try to login
      if (!existingUser.passwordHash) {
        throw new Error(
          "Account exists but has no password. Please contact support.",
        );
      }

      // Verify password
      const passwordHash = await hashPassword(args.password);
      if (existingUser.passwordHash !== passwordHash) {
        throw new Error("Incorrect password");
      }

      // Create session
      const token = generateToken();
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      await ctx.db.insert("sessions", {
        userId: existingUser._id,
        token,
        expiresAt,
      });

      return { userId: existingUser._id, token, isNewUser: false };
    }
    // User doesn't exist - create new account
    const passwordHash = await hashPassword(args.password);

    // Create user with initial $1000 USD and 0 of each token
    const userId = await ctx.db.insert("users", {
      username: args.username,
      passwordHash,
      balance: 1000,
      cnvxAmount: 0,
      tokenBalances: { CNVX: 0, BUN: 0, NEXT: 0, SHAD: 0 },
    });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
    });

    return { userId, token, isNewUser: true };
  },
});

// Login (kept for backwards compatibility, but loginOrRegister is preferred)
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by username
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q: any) => q.eq("username", args.username))
      .first();

    if (!user) {
      throw new Error(
        "User not found. Account will be created automatically on first login.",
      );
    }

    if (!user.passwordHash) {
      throw new Error(
        "Account exists but has no password. Please contact support.",
      );
    }

    // Verify password
    const passwordHash = await hashPassword(args.password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("Incorrect password");
    }

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
    });

    return { userId: user._id, token };
  },
});

// Get current user from session token
export const getCurrentUser = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if session expired (queries can't delete, so we just return null)
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
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

// Logout
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Get or create user by device ID (auto-login without password)
export const getOrCreateUserByDeviceId = mutation({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to find existing user by deviceId
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q: any) => q.eq("deviceId", args.deviceId))
      .first();

    if (existingUser) {
      // Return existing user
      return {
        userId: existingUser._id,
        balance: existingUser.balance,
        cnvxAmount: existingUser.cnvxAmount,
        tokenBalances: existingUser.tokenBalances,
      };
    }

    // Create new user with initial $1000 USD and 0 of each token
    const userId = await ctx.db.insert("users", {
      deviceId: args.deviceId,
      balance: 1000,
      cnvxAmount: 0,
      tokenBalances: { CNVX: 0, BUN: 0, NEXT: 0, SHAD: 0 },
    });

    const newUser = await ctx.db.get(userId);
    if (!newUser) {
      throw new Error("Failed to create user");
    }

    return {
      userId: newUser._id,
      balance: newUser.balance,
      cnvxAmount: newUser.cnvxAmount,
      tokenBalances: newUser.tokenBalances,
    };
  },
});
