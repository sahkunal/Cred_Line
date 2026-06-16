"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface CountdownTimerProps {
  targetTimestamp: number; // unix seconds
  className?: string;
  onComplete?: () => void;
}

export function CountdownTimer({
  targetTimestamp,
  className,
  onComplete,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, targetTimestamp - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) onComplete?.();
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining, onComplete]);

  const isDue = remaining <= 0;

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        isDue ? "text-success" : "text-foreground",
        className
      )}
    >
      {isDue ? "Ready" : formatCountdown(remaining)}
    </span>
  );
}
