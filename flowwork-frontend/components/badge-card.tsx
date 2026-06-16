"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Shield } from "lucide-react";
import { cn, type BadgeTier, TIER_LABELS } from "@/lib/utils";

export interface BadgeCardProps {
  tier: BadgeTier;
  locked?: boolean;
  requiredScore?: number;
  mintDate?: string;
  compositeScore?: number;
  totalContracts?: number;
  totalEarned?: string;
  onClick?: () => void;
  size?: "sm" | "lg";
}

const TIER_STYLES: Record<
  BadgeTier,
  { border: string; glow: string; gradient: string; text: string }
> = {
  none: {
    border: "border-white/10",
    glow: "",
    gradient: "from-white/10 to-white/5",
    text: "text-muted-foreground",
  },
  bronze: {
    border: "border-amber-700/40",
    glow: "shadow-[0_0_24px_rgba(192,133,82,0.25)]",
    gradient: "from-amber-700/30 via-amber-500/20 to-amber-300/10",
    text: "text-amber-300",
  },
  silver: {
    border: "border-slate-300/30",
    glow: "shadow-[0_0_24px_rgba(199,204,216,0.25)]",
    gradient: "from-slate-300/30 via-slate-100/20 to-slate-400/10",
    text: "text-slate-200",
  },
  gold: {
    border: "border-amber-300/40",
    glow: "shadow-[0_0_28px_rgba(240,194,91,0.3)]",
    gradient: "from-amber-200/30 via-yellow-300/20 to-amber-500/10",
    text: "text-amber-200",
  },
  platinum: {
    border: "border-cyan-200/40",
    glow: "shadow-[0_0_32px_rgba(124,58,237,0.35)]",
    gradient: "from-cyan-200/30 via-violet-300/25 to-pink-200/25",
    text: "text-foreground",
  },
};

export function BadgeCard({
  tier,
  locked = false,
  requiredScore,
  mintDate,
  compositeScore,
  totalContracts,
  totalEarned,
  onClick,
  size = "lg",
}: BadgeCardProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const style = TIER_STYLES[tier];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (locked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setRotate({ x: py * -10, y: px * 10 });
  };

  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `perspective(800px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
      }}
      whileHover={{ scale: locked ? 1 : 1.02 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className={cn(
        "relative rounded-2xl border overflow-hidden cursor-pointer select-none",
        "bg-gradient-to-br backdrop-blur-xl",
        style.gradient,
        style.border,
        !locked && style.glow,
        locked && "opacity-50 grayscale",
        size === "lg" ? "p-6 aspect-[3/4]" : "p-4 aspect-[3/4]"
      )}
    >
      {tier === "platinum" && !locked && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -inset-1/2 bg-gradient-to-tr from-transparent via-white/20 to-transparent rotate-12 animate-shimmer" />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "rounded-xl p-2.5 border",
              locked ? "border-white/10 bg-white/5" : `${style.border} bg-white/10`
            )}
          >
            {locked ? (
              <Lock size={size === "lg" ? 20 : 16} className="text-muted-foreground" />
            ) : (
              <Shield size={size === "lg" ? 20 : 16} className={style.text} />
            )}
          </div>
          <span className={cn("font-mono text-[10px] uppercase tracking-widest", style.text)}>
            FlowBadge
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <h3
            className={cn(
              "font-display font-bold tracking-tight",
              size === "lg" ? "text-2xl" : "text-lg",
              locked ? "text-muted-foreground" : style.text
            )}
          >
            {TIER_LABELS[tier]}
          </h3>
          {locked && requiredScore !== undefined && (
            <p className="text-xs text-muted-foreground">
              Requires score ≥ {requiredScore}
            </p>
          )}
        </div>

        {!locked && (compositeScore !== undefined || mintDate) && (
          <div className="space-y-1.5 text-xs font-mono text-muted-foreground border-t border-white/10 pt-3">
            {compositeScore !== undefined && (
              <div className="flex justify-between">
                <span>Score at mint</span>
                <span className="text-foreground">{compositeScore}</span>
              </div>
            )}
            {totalContracts !== undefined && (
              <div className="flex justify-between">
                <span>Contracts</span>
                <span className="text-foreground">{totalContracts}</span>
              </div>
            )}
            {totalEarned && (
              <div className="flex justify-between">
                <span>Earned</span>
                <span className="text-foreground">{totalEarned}</span>
              </div>
            )}
            {mintDate && (
              <div className="flex justify-between">
                <span>Minted</span>
                <span className="text-foreground">{mintDate}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
