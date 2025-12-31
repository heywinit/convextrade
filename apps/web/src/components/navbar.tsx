"use client";

import { useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";

export function Navbar({ userId }: { userId: string | null }) {
  const user = useQuery(
    (api as any).users.getUser,
    userId ? { userId: userId as any } : "skip"
  );

  const balance = user ? `$${user.balance.toFixed(2)}` : "$0.00";
  const cnvx = user ? user.cnvxAmount.toFixed(4) : "0.0000";

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">ConvexTrade</h1>
          <span className="text-xs text-muted-foreground">CNVX/USD</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Balance</span>
            <span className="text-sm font-medium">{balance}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">CNVX</span>
            <span className="text-sm font-medium">{cnvx}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
