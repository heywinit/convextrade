"use client";

import { api } from "@convextrade/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "./ui/button";

export function Navbar({
  userId,
  token,
}: {
  userId: string | null;
  token: string | null;
}) {
  const user = useQuery(
    (api as any).users.getUser,
    userId ? { userId: userId as any } : "skip",
  );
  const currentUser = useQuery(
    (api as any).auth.getCurrentUser,
    token ? { token } : "skip",
  );
  const logout = useMutation((api as any).auth.logout);

  const balance = user ? `$${user.balance.toFixed(2)}` : "$0.00";
  const cnvx = user ? user.cnvxAmount.toFixed(4) : "0.0000";
  const username = currentUser?.username || "User";

  const handleLogout = async () => {
    if (token) {
      try {
        await logout({ token });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    localStorage.removeItem("authToken");
    window.location.reload();
  };

  return (
    <nav className="border-border border-b bg-card">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg tracking-tight">ConvexTrade</h1>
          <span className="text-muted-foreground text-xs">CNVX/USD</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-xs">User</span>
            <span className="font-medium text-sm">{username}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-xs">Balance</span>
            <span className="font-medium text-sm">{balance}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-xs">CNVX</span>
            <span className="font-medium text-sm">{cnvx}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
