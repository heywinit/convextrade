"use client";

import { useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function OrderHistory({ userId }: { userId: string | null }) {
  const orderHistory = useQuery(
    (api as any).orders.getUserOrderHistory,
    userId ? { userId: userId as any } : "skip",
  );

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">Please wait for user initialization</div>
        </CardContent>
      </Card>
    );
  }

  if (!orderHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (orderHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">No orders yet</div>
        </CardContent>
      </Card>
    );
  }

  const formatOrderId = (id: string) => {
    // Extract last 8 characters of the ID
    const idStr = typeof id === "string" ? id : String(id);
    return idStr.length > 8 ? idStr.slice(-8).toUpperCase() : idStr.toUpperCase();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "filled":
        return "text-green-600 dark:text-green-400";
      case "pending":
        return "text-yellow-600 dark:text-yellow-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      case "cancelled":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground pb-2 border-b">
            <div>ID</div>
            <div>Token</div>
            <div>Type</div>
            <div>Side</div>
            <div>Price</div>
            <div>Quantity</div>
            <div>Status</div>
          </div>

          {/* Orders */}
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {orderHistory.map((order: any) => (
              <div
                key={order._id}
                className="grid grid-cols-7 gap-2 text-xs py-1.5 px-1 hover:bg-muted/50 rounded border-b border-border/50 last:border-0"
              >
                <div className="font-mono text-[10px] text-muted-foreground">
                  {formatOrderId(order._id)}
                </div>
                <div className="font-medium">{order.token ?? "CNVX"}</div>
                <div className="capitalize">{order.type}</div>
                <div
                  className={`font-medium ${
                    order.side === "buy"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {order.side.toUpperCase()}
                </div>
                <div className="font-mono">
                  {order.type === "market" && order.status === "pending"
                    ? "Market"
                    : `$${order.price.toFixed(2)}`}
                </div>
                <div className="font-mono">{order.quantity.toFixed(4)}</div>
                <div className="space-y-0.5">
                  <div className={`capitalize ${getStatusColor(order.status)}`}>
                    {order.status}
                  </div>
                  {order.failureReason && (
                    <div className="text-[10px] text-red-600 dark:text-red-400 truncate" title={order.failureReason}>
                      {order.failureReason}
                    </div>
                  )}
                  {order.status === "filled" && order.filledQuantity > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      Filled: {order.filledQuantity.toFixed(4)}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

