"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { FilePlus2, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { AddressDisplay } from "@/components/address-display";
import { EmptyState } from "@/components/empty-state";
import { useContracts, type ContractStatus, type PayFrequency } from "@/lib/hooks/useContracts";
import { formatUsdc, cn } from "@/lib/utils";

const STATUS_STYLES: Record<ContractStatus, string> = {
  active: "text-success bg-success/10 border-success/30",
  due: "text-warning bg-warning/10 border-warning/30",
  cancelled: "text-danger bg-danger/10 border-danger/30",
  completed: "text-muted-foreground bg-white/5 border-white/10",
};

const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
};

export default function ContractsPage() {
  const { connected } = useWallet();
  const { data: contracts, isLoading } = useContracts();

  if (!connected) {
    return (
      <div className="pt-16">
        <EmptyState icon={ShieldCheck} title="Connect your wallet" description="Connect to view and manage your FlowPay contracts." />
      </div>
    );
  }

  return (
    <div className="pt-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Contracts</h1>
        <Link
          href="/contracts/new"
          className="rounded-xl px-4 py-2 text-sm font-medium font-display text-background bg-flow-gradient hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <FilePlus2 size={16} /> Create contract
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : !contracts || contracts.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="No contracts yet"
          description="Create your first recurring payroll contract to start building your FlowScore."
          action={
            <Link href="/contracts/new" className="rounded-xl px-4 py-2 text-sm font-medium font-display text-background bg-flow-gradient">
              Create your first contract
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <Link key={contract.pda} href={`/contracts/${contract.pda}`}>
              <GlassCard hover className="p-5 flex items-center justify-between gap-4 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="flex items-center -space-x-2">
                    <AddressDisplay address={contract.payer} showAvatar size="sm" />
                    <span className="text-muted-foreground text-xs px-2">&rarr;</span>
                    <AddressDisplay address={contract.payee} showAvatar size="sm" />
                  </div>
                </div>

                <div className="hidden sm:block text-sm text-muted-foreground">
                  {FREQUENCY_LABELS[contract.frequency]}
                </div>

                <div className="font-mono text-sm text-foreground">{formatUsdc(contract.amount)}</div>

                <div className="hidden md:block text-sm">
                  {contract.status === "active" || contract.status === "due" ? (
                    <CountdownTimer targetTimestamp={contract.nextPayoutTimestamp} className="text-xs" />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>

                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full border capitalize",
                    STATUS_STYLES[contract.status]
                  )}
                >
                  {contract.status}
                </span>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
