"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

export interface LoanAccountData {
  amount: number; // raw USDC units
  dueTimestamp: number;
  issuedTimestamp: number;
  repaid: boolean;
}

export interface PoolStats {
  totalLiquidity: number;
  totalBorrowed: number;
  utilizationRate: number;
  poolMinScore: number;
}

/**
 * TODO: replace mock with real fetch via FlowLend program:
 *   const [pda] = deriveLoanAccountPda(wallet.publicKey)
 *   program.account.loanAccount.fetchNullable(pda)
 */
async function fetchActiveLoan(walletAddress: string): Promise<LoanAccountData | null> {
  await new Promise((r) => setTimeout(r, 350));
  const now = Math.floor(Date.now() / 1000);
  return {
    amount: 500_000_000,
    issuedTimestamp: now - 3 * 86400,
    dueTimestamp: now + 4 * 86400,
    repaid: false,
  };
}

async function fetchPoolStats(): Promise<PoolStats> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    totalLiquidity: 250_000_000_000,
    totalBorrowed: 142_000_000_000,
    utilizationRate: 0.568,
    poolMinScore: 400,
  };
}

export function useLoan() {
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();

  return useQuery({
    queryKey: ["loan", address],
    queryFn: () => fetchActiveLoan(address as string),
    enabled: !!address,
  });
}

export function usePoolStats() {
  return useQuery({
    queryKey: ["poolStats"],
    queryFn: fetchPoolStats,
  });
}
