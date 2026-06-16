"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { ScoreGauge } from "@/components/score-gauge";
import { AddressDisplay } from "@/components/address-display";
import { BadgeCard } from "@/components/badge-card";
import { EmptyState } from "@/components/empty-state";
import { useScoreAccount } from "@/lib/hooks/useScoreAccount";
import { useBadge } from "@/lib/hooks/useBadge";
import { formatUsdc, formatRelativeTime } from "@/lib/utils";

export default function ExplorePage() {
  const [input, setInput] = useState("");
  const [searched, setSearched] = useState<string | null>(null);

  const { data: score, isLoading: scoreLoading } = useScoreAccount(searched ?? undefined);
  const { data: badge } = useBadge();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) setSearched(input.trim());
  };

  return (
    <div className="pt-8 max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold mb-2">Explore reputation</h1>
        <p className="text-sm text-muted-foreground">
          Look up any wallet&apos;s public FlowScore, badge tier, and payment history.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a Solana wallet address"
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-mono outline-none focus:border-flow-violet/50 transition-colors"
        />
        <button
          type="submit"
          className="rounded-xl px-5 bg-flow-gradient text-background flex items-center justify-center"
        >
          <Search size={18} />
        </button>
      </form>

      {!searched && (
        <EmptyState
          icon={Search}
          title="Search a wallet"
          description="Enter any wallet address to view its public on-chain reputation, useful for vetting freelancers before hiring."
        />
      )}

      {searched && scoreLoading && (
        <div className="skeleton h-72 rounded-2xl" />
      )}

      {searched && score && !scoreLoading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <GlassCard className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={score.composite} size={140} />
            <div className="flex-1 text-center sm:text-left">
              <AddressDisplay address={searched} showAvatar showCopy className="justify-center sm:justify-start mb-3" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Total contracts</div>
                  <div className="font-mono text-foreground">{score.totalContracts}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total earned</div>
                  <div className="font-mono text-foreground">{formatUsdc(score.totalEarned)}</div>
                </div>
              </div>
            </div>
          </GlassCard>

          {badge && (
            <div className="max-w-[180px]">
              <BadgeCard
                tier={badge.tier}
                mintDate={badge.mintDate ?? undefined}
                compositeScore={badge.compositeScoreAtMint ?? undefined}
                size="sm"
              />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
