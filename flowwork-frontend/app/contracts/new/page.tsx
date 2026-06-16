"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { cn } from "@/lib/utils";
import type { PayFrequency } from "@/lib/hooks/useContracts";

type Step = "form" | "approve" | "initialize" | "success";

const FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

export default function NewContractPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<PayFrequency>("weekly");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("approve");

    // TODO: replace with real wallet-adapter signing + FlowPay program calls
    // 1. approve SPL delegate for `amount` to FlowPay's PDA authority
    await new Promise((r) => setTimeout(r, 1400));
    setStep("initialize");

    // 2. call flowpay.initializeContract(recipient, amount, frequency)
    await new Promise((r) => setTimeout(r, 1400));
    setStep("success");
  };

  return (
    <div className="pt-8 max-w-lg mx-auto">
      <button
        onClick={() => router.push("/contracts")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeft size={15} /> Back to contracts
      </button>

      <GlassCard className="p-7">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <h1 className="font-display text-lg font-bold">Create contract</h1>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Recipient address</label>
                <input
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Solana wallet address"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-flow-violet/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Amount (USDC)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-flow-violet/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Frequency</label>
                <div className="grid grid-cols-4 gap-2">
                  {FREQUENCIES.map((f) => (
                    <button
                      type="button"
                      key={f.value}
                      onClick={() => setFrequency(f.value)}
                      className={cn(
                        "rounded-lg py-2 text-xs font-medium border transition-colors",
                        frequency === f.value
                          ? "border-flow-violet/50 bg-flow-gradient-soft text-foreground"
                          : "border-white/10 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl py-3 text-sm font-display font-semibold text-background bg-flow-gradient hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </motion.form>
          )}

          {(step === "approve" || step === "initialize") && (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6"
            >
              <h2 className="font-display text-lg font-bold mb-6">Setting up contract</h2>
              <div className="space-y-4">
                <StepRow
                  index={1}
                  label="Approve delegate"
                  active={step === "approve"}
                  done={step === "initialize"}
                />
                <StepRow
                  index={2}
                  label="Initialize contract"
                  active={step === "initialize"}
                  done={false}
                />
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="w-16 h-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-4"
              >
                <Check size={28} className="text-success" />
              </motion.div>
              <h2 className="font-display text-lg font-bold mb-1">Contract created</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your FlowPay contract is now active and will execute on schedule.
              </p>
              <button
                onClick={() => router.push("/contracts")}
                className="rounded-xl px-5 py-2.5 text-sm font-display font-semibold text-background bg-flow-gradient"
              >
                View contracts
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
}

function StepRow({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border shrink-0",
          done
            ? "bg-success/10 border-success/30"
            : active
            ? "border-flow-violet/50 bg-flow-gradient-soft"
            : "border-white/10 bg-white/5"
        )}
      >
        {done ? (
          <Check size={14} className="text-success" />
        ) : active ? (
          <Loader2 size={14} className="animate-spin text-foreground" />
        ) : (
          <span className="text-xs text-muted-foreground">{index}</span>
        )}
      </div>
      <span className={cn("text-sm", active || done ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}
