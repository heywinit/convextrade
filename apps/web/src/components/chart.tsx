"use client";

import { useQuery } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useEffect, useRef } from "react";

export function Chart() {
  const priceHistory = useQuery((api as any).priceHistory.getPriceHistory, { limit: 100 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!priceHistory || priceHistory.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find min and max prices
    const prices = priceHistory.map((h) => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid
    ctx.strokeStyle = "oklch(var(--border))";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw price line
    ctx.strokeStyle = "oklch(var(--primary))";
    ctx.lineWidth = 2;
    ctx.beginPath();

    priceHistory.forEach((point, index) => {
      const x = (width / (priceHistory.length - 1)) * index;
      const normalizedPrice = (point.price - minPrice) / priceRange;
      const y = height - normalizedPrice * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw area under curve
    ctx.fillStyle = "oklch(var(--primary) / 0.1)";
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Draw current price
    if (priceHistory.length > 0) {
      const currentPrice = priceHistory[priceHistory.length - 1].price;
      const normalizedPrice = (currentPrice - minPrice) / priceRange;
      const y = height - normalizedPrice * height;

      ctx.fillStyle = "oklch(var(--primary))";
      ctx.beginPath();
      ctx.arc(width, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Price label
      ctx.fillStyle = "oklch(var(--foreground))";
      ctx.font = "12px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`$${currentPrice.toFixed(2)}`, width - 8, y - 8);
    }

    // Y-axis labels
    ctx.fillStyle = "oklch(var(--muted-foreground))";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    for (let i = 0; i <= 4; i++) {
      const price = maxPrice - (priceRange / 4) * i;
      const y = (height / 4) * i;
      ctx.fillText(`$${price.toFixed(2)}`, 8, y + 4);
    }
  }, [priceHistory]);

  const currentPrice = priceHistory?.[priceHistory.length - 1]?.price ?? 10.0;
  const priceChange =
    priceHistory && priceHistory.length > 1
      ? currentPrice - priceHistory[0].price
      : 0;
  const priceChangePercent =
    priceHistory && priceHistory.length > 1
      ? ((priceChange / priceHistory[0].price) * 100).toFixed(2)
      : "0.00";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Price Chart</CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">${currentPrice.toFixed(2)}</div>
              <div
                className={`text-xs ${
                  priceChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChangePercent}%
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="h-full w-full"
            style={{ imageRendering: "crisp-edges" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

