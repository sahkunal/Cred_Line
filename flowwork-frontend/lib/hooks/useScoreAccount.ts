"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

export interface ScoreAccountData {
  composite: number;
  paymentScore: number;
  defaultPenalty: number;
  totalContracts: number;
  totalEarned: number; // raw USDC units (6 decimals)
  kycVerified: boolean;
  kycProvider: string | null;
  asWorker: { composite: number; totalContracts: number } | null;
  asClient: { composite: number; totalContracts: number } | null;
  history: { timestamp: number; composite: number }[];
}

/**
 * TODO: replace mock with real fetch via FlowScore program:
 *   const [pda] = deriveScoreAccountPda(wallet.publicKey)
 *   const account = await program.account.scoreAccount.fetch(pda)
 */
async function fetchScoreAccount(walletAddress: string): Promise<ScoreAccountData> {
  await new Promise((r) => setTimeout(r, 400));

  const now = Math.floor(Date.now() / 1000);
  return {
    composite: 742,
    paymentScore: 680,
    defaultPenalty: 20,
    totalContracts: 14,
    totalEarned: 24_810_000_000,
    kycVerified: false,
    kycProvider: null,
    asWorker: { composite: 742, totalContracts: 11 },
    asClient: { composite: 610, totalContracts: 3 },
    history: Array.from({ length: 12 }).map((_, i) => ({
      timestamp: now - (11 - i) * 7 * 86400,
      composite: 420 + Math.round(i * 28 + Math.sin(i) * 15),
    })),
  };
}

export function useScoreAccount(walletAddress?: string) {
  const { publicKey } = useWallet();
  const address = walletAddress ?? publicKey?.toBase58();

  return useQuery({
    queryKey: ["scoreAccount", address],
    queryFn: () => fetchScoreAccount(address as string),
    enabled: !!address,
  });
}
