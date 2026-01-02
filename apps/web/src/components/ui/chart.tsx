import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ChartContainer({ children, className }: ChartContainerProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

