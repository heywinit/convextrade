import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconButtonProps {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  className?: string;
  onClick?: () => void;
}

export function IconButton({
  icon: Icon,
  bgColor,
  iconColor,
  className,
  onClick,
}: IconButtonProps) {
  return (
    <div
      className={cn(
        "flex cursor-pointer items-center rounded-full p-2 transition-all hover:scale-105 hover:brightness-120",
        bgColor,
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Icon strokeWidth={1.5} className={cn("size-4", iconColor)} />
    </div>
  );
}
