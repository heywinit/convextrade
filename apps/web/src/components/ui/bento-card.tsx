import type { LucideIcon } from "lucide-react";
import { Expand } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  title: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  value: string | number;
  subtitle?: string;
  subtitleClassName?: string;
  className?: string;
}

export function BentoCard({
  title,
  icon: Icon,
  iconBgColor = "bg-green-900 hover:scale-100 cursor-default",
  iconColor = "text-green-400",
  value,
  subtitle,
  subtitleClassName,
  className,
}: BentoCardProps) {
  return (
    <Card className={cn("py-0 pt-4 pb-2", className)}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconButton
            icon={Icon}
            bgColor={iconBgColor}
            iconColor={iconColor}
          />
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
        </div>
        <IconButton
          icon={Expand}
          bgColor="bg-card"
          iconColor="text-green-600"
        />
      </CardHeader>
      <CardContent className="relative pb-0">
        <div className="pb-2 font-bold text-4xl">{value}</div>
        {subtitle && (
          <div className={cn("absolute right-2 bottom-0 rounded-full px-3 py-1 font-medium text-sm", subtitleClassName)}>
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

