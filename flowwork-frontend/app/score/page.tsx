"use client";

import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useWallet } from "@solana/wallet-adapter-react";
import { ShieldCheck, Lock } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { ScoreGauge } from "@/components/score-gauge";
import { EmptyState } from "@/components/empty-state";
import { useScoreAccount } from "@/lib/hooks/useScoreAccount";

function ProgressBar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-flow-gradient"
        />
      </div>
    </div>
  );
}

export default function ScorePage() {
  const { connected } = useWallet();
  const { data: score, isLoading } = useScoreAccount();

  if (!connected) {
    return (
      <div className="pt-16">
        <EmptyState icon={ShieldCheck} title="Connect your wallet" description="View your full FlowScore breakdown once connected." />
      </div>
    );
  }

  if (isLoading || !score) {
    return (
      <div className="pt-8 grid lg:grid-cols-[1fr_1.3fr] gap-5">
        <div className="skeleton h-80 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  const chartData = score.history.map((h) => ({
    date: new Date(h.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: h.composite,
  }));

  return (
    <div className="pt-8 space-y-5">
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-5">
        <GlassCard className="p-8 flex flex-col items-center justify-center">
          <ScoreGauge score={score.composite} size={220} />
        </GlassCard>

        <GlassCard className="p-6 space-y-5">
          <h2 className="font-display font-semibold text-base">Score breakdown</h2>
          <ProgressBar label="Payment score" value={score.paymentScore} max={1000} />
          <ProgressBar label="Default penalty" value={score.defaultPenalty} max={100} />
          <ProgressBar label="Total contracts" value={score.totalContracts} max={50} />
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-sm text-muted-foreground">KYC status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md bg-white/5 text-muted-foreground border border-white/10">
              <Lock size={12} />
              {score.kycVerified ? "Verified" : "Not verified"}
            </span>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 className="font-display font-semibold text-base mb-4">Score history</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="50%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#7d8aa3" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#7d8aa3" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1000]} />
              <Tooltip
                contentStyle={{
                  background: "#0f1420",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#9aa4b8" }}
              />
              <Line type="monotone" dataKey="score" stroke="url(#scoreLine)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {score.asWorker && score.asClient && (
        <div className="grid sm:grid-cols-2 gap-5">
          <GlassCard className="p-6">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">As a worker</h3>
            <div className="font-display text-3xl font-bold">{score.asWorker.composite}</div>
            <p className="text-sm text-muted-foreground mt-1">{score.asWorker.totalContracts} contracts completed</p>
          </GlassCard>
          <GlassCard className="p-6">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">As a client</h3>
            <div className="font-display text-3xl font-bold">{score.asClient.composite}</div>
            <p className="text-sm text-muted-foreground mt-1">{score.asClient.totalContracts} contracts paid out</p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
