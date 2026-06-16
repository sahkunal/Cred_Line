import { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <GlassCard className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      <div className="rounded-2xl bg-flow-gradient-soft border border-white/10 p-4 mb-4">
        <Icon size={28} className="text-foreground" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action}
    </GlassCard>
  );
}
