"use client";

import { useState } from "react";
import Avatar from "boring-avatars";
import { Check, Copy } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";

export interface AddressDisplayProps {
  address: string;
  showAvatar?: boolean;
  showCopy?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { avatar: 20, text: "text-xs" },
  md: { avatar: 28, text: "text-sm" },
  lg: { avatar: 36, text: "text-base" },
};

export function AddressDisplay({
  address,
  showAvatar = false,
  showCopy = false,
  size = "md",
  className,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { avatar, text } = SIZE_MAP[size];

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showAvatar && (
        <div className="rounded-full overflow-hidden shrink-0" style={{ width: avatar, height: avatar }}>
          <Avatar
            size={avatar}
            name={address}
            variant="marble"
            colors={["#00f0ff", "#7c3aed", "#ec4899", "#0a0e17", "#f4f6fb"]}
          />
        </div>
      )}
      <span className={cn("font-mono text-foreground", text)}>
        {truncateAddress(address)}
      </span>
      {showCopy && (
        <button
          onClick={handleCopy}
          aria-label="Copy address"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}
