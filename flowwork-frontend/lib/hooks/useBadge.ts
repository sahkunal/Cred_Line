"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { scoreToTier, type BadgeTier } from "@/lib/utils";

export interface BadgeAccountData {
  tier: BadgeTier;
  mintDate: string | null;
  compositeScoreAtMint: number | null;
  totalContractsAtMint: number | null;
  totalEarnedAtMint: number | null;
}

/**
 * TODO: replace mock with real fetch via FlowBadge program:
 *   const [pda] = deriveBadgeAccountPda(wallet.publicKey)
 *   program.account.badgeAccount.fetchNullable(pda)
 */
async function fetchBadge(walletAddress: string): Promise<BadgeAccountData> {
  await new Promise((r) => setTimeout(r, 350));
  return {
    tier: "gold",
    mintDate: "2026-04-12",
    compositeScoreAtMint: 705,
    totalContractsAtMint: 10,
    totalEarnedAtMint: 18_200_000_000,
  };
}

export function useBadge() {
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();

  return useQuery({
    queryKey: ["badge", address],
    queryFn: () => fetchBadge(address as string),
    enabled: !!address,
  });
}

export const ALL_TIERS: { tier: BadgeTier; minScore: number }[] = [
  { tier: "bronze", minScore: 400 },
  { tier: "silver", minScore: 550 },
  { tier: "gold", minScore: 700 },
  { tier: "platinum", minScore: 850 },
];
