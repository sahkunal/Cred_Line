"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Wallet2, Gauge, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { WalletButton } from "@/components/wallet-button";

const STEPS = [
  {
    icon: Wallet2,
    title: "FlowPay",
    description:
      "Set up recurring USDC payroll via SPL delegation. Payers approve once, payments execute on schedule.",
  },
  {
    icon: Gauge,
    title: "FlowScore",
    description:
      "Every completed payment builds an on-chain composite score (0-1000) — your portable credit history.",
  },
  {
    icon: ShieldCheck,
    title: "FlowBadge & FlowLend",
    description:
      "High scores mint soulbound reputation badges and unlock micro-loans against your on-chain history.",
  },
];

const STATS = [
  { label: "Volume processed", value: "$2.4M" },
  { label: "Active contracts", value: "1,204" },
  { label: "Badges minted", value: "3,891" },
];

export default function LandingPage() {
  return (
    <div className="pt-16 sm:pt-24">
      <section className="text-center max-w-3xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-display text-4xl sm:text-6xl font-bold tracking-tight leading-tight"
        >
          Your work is{" "}
          <span className="text-gradient">your credit history</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mt-5 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto"
        >
          On-chain payroll and reputation for gig workers and cross-border
          freelancers. Get paid in USDC, build a credit history banks never
          gave you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <WalletButton />
          <Link
            href="/explore"
            className="rounded-xl px-4 py-2 text-sm font-medium glass glass-hover flex items-center gap-1.5"
          >
            Explore reputations <ArrowRight size={15} />
          </Link>
        </motion.div>
      </section>

      <section className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <GlassCard className="p-5 text-center">
              <div className="font-display text-2xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </section>

      <section className="mt-28">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-display text-2xl sm:text-3xl font-bold text-center mb-12"
        >
          How it works
        </motion.h2>

        <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <GlassCard hover className="p-6 h-full">
                <div className="rounded-xl bg-flow-gradient-soft border border-white/10 p-3 w-fit mb-4">
                  <step.icon size={22} className="text-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
