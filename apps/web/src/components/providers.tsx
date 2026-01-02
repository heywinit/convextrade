import { env } from "@convextrade/env/web";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import { ThemeProvider } from "./theme-provider";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </ThemeProvider>
  );
}
