import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: "none" | "violet" | "teal" | "magenta";
}

const GLOW_MAP: Record<NonNullable<GlassCardProps["glow"]>, string> = {
  none: "",
  violet: "shadow-glow",
  teal: "shadow-glow-teal",
  magenta: "shadow-glow-magenta",
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hover = false, glow = "none", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass rounded-2xl",
          hover && "glass-hover",
          GLOW_MAP[glow],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";
