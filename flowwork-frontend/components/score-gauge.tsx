"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn, scoreToTier, TIER_LABELS, type BadgeTier } from "@/lib/utils";

export interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showTier?: boolean;
  className?: string;
}

const TIER_GRADIENT_IDS: Record<BadgeTier, string> = {
  none: "gaugeGradientNone",
  bronze: "gaugeGradientBronze",
  silver: "gaugeGradientSilver",
  gold: "gaugeGradientGold",
  platinum: "gaugeGradientPlatinum",
};

export function ScoreGauge({
  score,
  size = 200,
  strokeWidth = 14,
  showTier = true,
  className,
}: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(1000, score));
  const tier = scoreToTier(clamped);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useMotionValue(0);
  const [displayScore, setDisplayScore] = useState(0);
  const dashOffset = useTransform(
    progress,
    (value) => circumference - (value / 1000) * circumference
  );
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const controls = animate(progress, clamped, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayScore(Math.round(latest));
        setOffset(circumference - (latest / 1000) * circumference);
      },
    });
    return () => controls.stop();
  }, [clamped, circumference, progress]);

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="gaugeGradientPlatinum" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="gaugeGradientGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="gaugeGradientSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="gaugeGradientBronze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd9b8" />
            <stop offset="100%" stopColor="#92521f" />
          </linearGradient>
          <linearGradient id="gaugeGradientNone" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />

        {/* progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${TIER_GRADIENT_IDS[tier]})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className="font-display font-bold text-foreground leading-none"
          style={{ fontSize: size * 0.21 }}
        >
          {displayScore}
        </span>
        <span className="text-muted-foreground text-xs mt-1">/ 1000</span>
        {showTier && tier !== "none" && (
          <span className="mt-3 rounded-full border border-flow-violet/40 bg-flow-gradient-soft px-3 py-1 text-xs font-display font-medium text-foreground tracking-wide">
            {TIER_LABELS[tier].toUpperCase()} TIER
          </span>
        )}
      </div>
    </div>
  );
}
