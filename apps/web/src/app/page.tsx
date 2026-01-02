"use client";

import { api } from "@convextrade/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

// Generate a unique device ID
function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const getOrCreateUser = useMutation(api.auth.getOrCreateUserByDeviceId);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    
    // Auto-create or get user
    getOrCreateUser({ deviceId: id })
      .then((user) => {
        setUserId(user.userId);
      })
      .catch((error) => {
        console.error("Failed to get or create user:", error);
      });
  }, [getOrCreateUser]);

  return (
    <div className="min-h-screen bg-background p-8">
      <main className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">ConvexTrade</h1>
        {userId ? (
          <p className="text-muted-foreground">User ID: {userId}</p>
        ) : (
          <p className="text-muted-foreground">Loading...</p>
        )}
      </main>
    </div>
  );
}
