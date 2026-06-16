import { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  className?: string;
}

const DELTA_TONE_MAP: Record<NonNullable<StatCardProps["deltaTone"]>, string> = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-muted-foreground",
};

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <GlassCard hover className={cn("p-5", className)}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        {Icon && <Icon size={16} className="text-muted-foreground" />}
      </div>
      <div className="font-display text-2xl font-bold text-foreground">{value}</div>
      {delta && (
        <div className={cn("mt-1.5 text-xs font-mono", DELTA_TONE_MAP[deltaTone])}>
          {delta}
        </div>
      )}
    </GlassCard>
  );
}
