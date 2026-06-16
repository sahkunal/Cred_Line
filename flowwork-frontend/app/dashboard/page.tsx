"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { FilePlus2, Coins, Medal, ArrowDownLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { ScoreGauge } from "@/components/score-gauge";
import { StatCard } from "@/components/stat-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { EmptyState } from "@/components/empty-state";
import { useScoreAccount } from "@/lib/hooks/useScoreAccount";
import { useContracts } from "@/lib/hooks/useContracts";
import { formatUsdc, formatRelativeTime, scoreToTier, TIER_LABELS } from "@/lib/utils";

export default function DashboardPage() {
  const { connected } = useWallet();
  const { data: score, isLoading: scoreLoading } = useScoreAccount();
  const { data: contracts, isLoading: contractsLoading } = useContracts();

  if (!connected) {
    return (
      <div className="pt-16">
        <EmptyState
          icon={ShieldCheck}
          title="Connect your wallet"
          description="Connect a Solana wallet to view your FlowScore, active contracts, and badge tier."
        />
      </div>
    );
  }

  const activeContracts = contracts?.filter((c) => c.status === "active" || c.status === "due") ?? [];
  const nextPayout = activeContracts
    .slice()
    .sort((a, b) => a.nextPayoutTimestamp - b.nextPayoutTimestamp)[0];

  const recentEvents = (contracts ?? [])
    .flatMap((c) => c.history.map((h) => ({ ...h, payee: c.payee })))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const tier = score ? scoreToTier(score.composite) : "none";

  return (
    <div className="pt-8 space-y-6">
      <div className="grid lg:grid-cols-[1.1fr_1.4fr] gap-5">
        <GlassCard className="p-7 flex flex-col items-center text-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">
            Composite score
          </span>
          {scoreLoading || !score ? (
            <div className="skeleton w-[180px] h-[180px] rounded-full" />
          ) : (
            <ScoreGauge score={score.composite} size={180} />
          )}
        </GlassCard>

        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total earned"
            value={score ? formatUsdc(score.totalEarned) : "—"}
            delta={score ? "+$1,240 this month" : undefined}
            deltaTone="positive"
          />
          <StatCard
            label="Active contracts"
            value={String(activeContracts.length)}
            delta={
              nextPayout
                ? `Next payout in ${Math.max(0, Math.round((nextPayout.nextPayoutTimestamp - Date.now() / 1000) / 3600))}h`
                : "No upcoming payouts"
            }
          />
          <StatCard
            label="Badge tier"
            value={TIER_LABELS[tier]}
            delta={tier !== "platinum" ? "Keep building your score" : "Max tier reached"}
            deltaTone="neutral"
          />
          <StatCard
            label="Loan eligibility"
            value={score && score.composite >= 400 ? "Eligible" : "Not yet"}
            delta={score && score.composite >= 400 ? "Up to $1,500 USDC" : "Reach score ≥ 400"}
            deltaTone={score && score.composite >= 400 ? "positive" : "neutral"}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <GlassCard className="p-6">
          <h2 className="font-display font-semibold text-base mb-4">Recent activity</h2>

          {contractsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activity yet — payments will show up here once contracts start running.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentEvents.map((event, i) => (
                <motion.li
                  key={event.signature + i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3.5 py-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-flow-teal/10 flex items-center justify-center shrink-0">
                    <ArrowDownLeft size={16} className="text-flow-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">Payment received</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(event.timestamp)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-foreground">{formatUsdc(event.amount)}</div>
                    <span className="inline-block mt-1 text-xs font-mono px-2 py-0.5 rounded-md bg-success/10 text-success">
                      +{event.scoreDelta}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </GlassCard>

        <div className="flex flex-col gap-3">
          <Link href="/contracts/new">
            <GlassCard hover glow="violet" className="p-4.5 flex items-center gap-3 cursor-pointer">
              <FilePlus2 size={20} className="text-flow-teal" />
              <span className="font-display font-semibold text-sm">Create contract</span>
            </GlassCard>
          </Link>
          <Link href="/lend">
            <GlassCard hover className="p-4.5 flex items-center gap-3 cursor-pointer">
              <Coins size={20} className="text-flow-magenta" />
              <span className="font-display font-semibold text-sm">Borrow USDC</span>
            </GlassCard>
          </Link>
          <Link href="/badges">
            <GlassCard hover className="p-4.5 flex items-center gap-3 cursor-pointer">
              <Medal size={20} className="text-flow-violet" />
              <span className="font-display font-semibold text-sm">View badge</span>
            </GlassCard>
          </Link>

          {nextPayout && (
            <GlassCard className="p-4.5 text-center mt-auto">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Next payout
              </div>
              <CountdownTimer
                targetTimestamp={nextPayout.nextPayoutTimestamp}
                className="text-xl font-bold"
              />
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
