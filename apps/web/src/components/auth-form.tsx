"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convextrade/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

export function AuthForm({
  onAuthSuccess,
}: {
  onAuthSuccess: (userId: string, token: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginOrRegister = useMutation((api as any).auth.loginOrRegister);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Please fill in all fields", {
        description: "Username and password are required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginOrRegister({ username, password });
      if (result) {
        localStorage.setItem("authToken", result.token);
        onAuthSuccess(result.userId, result.token);
        
        if (result.isNewUser) {
          toast.success("Account created successfully!", {
            description: `Welcome to ConvexTrade, ${username}! You start with $100 and 500 CNVX.`,
            duration: 5000,
          });
        } else {
          toast.success("Logged in successfully", {
            description: `Welcome back, ${username}!`,
          });
        }
      }
      setUsername("");
      setPassword("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      
      // Provide more helpful error messages
      if (errorMessage.includes("at least 3 characters")) {
        toast.error("Invalid username", {
          description: "Username must be at least 3 characters long",
        });
      } else if (errorMessage.includes("less than 20 characters")) {
        toast.error("Invalid username", {
          description: "Username must be less than 20 characters",
        });
      } else if (errorMessage.includes("letters, numbers, and underscores")) {
        toast.error("Invalid username", {
          description: "Username can only contain letters, numbers, and underscores",
        });
      } else if (errorMessage.includes("at least 6 characters")) {
        toast.error("Invalid password", {
          description: "Password must be at least 6 characters long",
        });
      } else if (errorMessage.includes("Incorrect password")) {
        toast.error("Incorrect password", {
          description: "The password you entered is incorrect. Please try again.",
        });
      } else {
        toast.error("Authentication failed", {
          description: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to ConvexTrade</CardTitle>
          <CardDescription>
            Enter your username and password. If you don't have an account, one will be created automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
                disabled={isLoading}
                minLength={3}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={isLoading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Processing..." : "Login / Create Account"}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              <p>New users start with $100 and 500 CNVX</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

