"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { ShieldCheck, Coins } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { EmptyState } from "@/components/empty-state";
import { useLoan, usePoolStats } from "@/lib/hooks/useLoan";
import { useScoreAccount } from "@/lib/hooks/useScoreAccount";
import { formatUsdc, formatCompact, getLoanStatus, LOAN_STATUS_COLORS, cn } from "@/lib/utils";

export default function LendPage() {
  const { connected } = useWallet();
  const { data: score } = useScoreAccount();
  const { data: loan, isLoading: loanLoading } = useLoan();
  const { data: pool } = usePoolStats();
  const [borrowAmount, setBorrowAmount] = useState(500);
  const [confirming, setConfirming] = useState(false);

  if (!connected) {
    return (
      <div className="pt-16">
        <EmptyState icon={ShieldCheck} title="Connect your wallet" description="Connect to check loan eligibility and borrow against your FlowScore." />
      </div>
    );
  }

  const minScore = pool?.poolMinScore ?? 400;
  const isEligible = score ? score.composite >= minScore : false;
  const maxBorrow = isEligible ? Math.round((score!.composite - minScore) * 5 + 200) : 0;
  const eligibilityPct = score ? Math.min(100, (score.composite / minScore) * 100) : 0;

  return (
    <div className="pt-8 space-y-5">
      <h1 className="font-display text-xl font-bold">FlowLend</h1>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base">Eligibility</h2>
          <span
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full border",
              isEligible ? "text-success bg-success/10 border-success/30" : "text-muted-foreground bg-white/5 border-white/10"
            )}
          >
            {isEligible ? "Eligible" : "Not eligible"}
          </span>
        </div>

        {!isEligible ? (
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Score vs minimum ({minScore})</span>
              <span className="font-mono text-foreground">{score?.composite ?? 0} / {minScore}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${eligibilityPct}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-flow-gradient"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You are eligible to borrow up to <span className="text-foreground font-mono">${maxBorrow}</span> USDC against your FlowScore.
          </p>
        )}
      </GlassCard>

      {isEligible && !loan && (
        <GlassCard className="p-6">
          <h2 className="font-display font-semibold text-base mb-4">Borrow</h2>
          <div className="mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-mono text-lg text-foreground">${borrowAmount}</span>
            </div>
            <input
              type="range"
              min={50}
              max={maxBorrow}
              step={10}
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(Number(e.target.value))}
              className="w-full accent-flow-violet"
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mb-5">
            <span>Due date</span>
            <span>7 days from disbursement</span>
          </div>
          <button
            onClick={() => setConfirming(true)}
            className="w-full rounded-xl py-3 text-sm font-display font-semibold text-background bg-flow-gradient hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <Coins size={16} /> Borrow ${borrowAmount} USDC
          </button>
        </GlassCard>
      )}

      {loanLoading ? (
        <div className="skeleton h-32 rounded-2xl" />
      ) : loan ? (
        <GlassCard className="p-6">
          <h2 className="font-display font-semibold text-base mb-4">Active loan</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Amount borrowed</div>
              <div className="font-mono text-lg text-foreground">{formatUsdc(loan.amount)}</div>
            </div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full border capitalize",
                LOAN_STATUS_COLORS[getLoanStatus(loan.dueTimestamp)]
              )}
            >
              {getLoanStatus(loan.dueTimestamp)}
            </span>
          </div>
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm text-muted-foreground">Due in</span>
            <CountdownTimer targetTimestamp={loan.dueTimestamp} />
          </div>
          <button className="w-full rounded-xl py-3 text-sm font-display font-semibold text-background bg-flow-gradient">
            Repay {formatUsdc(loan.amount)}
          </button>
        </GlassCard>
      ) : null}

      {pool && (
        <GlassCard className="p-5 flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Total liquidity</span>{" "}
            <span className="font-mono text-foreground">{formatCompact(pool.totalLiquidity / 1e6)} USDC</span>
          </div>
          <div>
            <span className="text-muted-foreground">Utilization</span>{" "}
            <span className="font-mono text-foreground">{Math.round(pool.utilizationRate * 100)}%</span>
          </div>
        </GlassCard>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <GlassCard className="p-6 max-w-sm w-full">
            <h3 className="font-display font-semibold text-base mb-2">Confirm loan</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Borrow ${borrowAmount} USDC, due in 7 days. This will create a LoanAccount PDA and transfer funds from the pool.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl py-2.5 text-sm font-medium glass glass-hover">
                Cancel
              </button>
              <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl py-2.5 text-sm font-display font-semibold text-background bg-flow-gradient">
                Confirm
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
