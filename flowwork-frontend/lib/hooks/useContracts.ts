"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

export type ContractStatus = "active" | "due" | "cancelled" | "completed";
export type PayFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface PayHistoryEvent {
  signature: string;
  timestamp: number;
  amount: number; // raw USDC units
  scoreDelta: number;
}

export interface FlowPayContract {
  pda: string;
  payer: string;
  payee: string;
  amount: number; // raw USDC units, per payout
  frequency: PayFrequency;
  nextPayoutTimestamp: number;
  status: ContractStatus;
  history: PayHistoryEvent[];
}

/**
 * TODO: replace mock with real fetch via FlowPay program:
 *   program.account.flowPayContract.all([{ memcmp: { offset: 8, bytes: payer } }])
 */
async function fetchContracts(walletAddress: string): Promise<FlowPayContract[]> {
  await new Promise((r) => setTimeout(r, 400));
  const now = Math.floor(Date.now() / 1000);

  return [
    {
      pda: "9xQk7mP3aGz1VnL8sFh2dC4eR6tYwU5bN0jK1qX2zM3a",
      payer: walletAddress,
      payee: "5tBn2xQk7mP3aGz1VnL8sFh2dC4eR6tYwU5bN0jK1qX2",
      amount: 420_000_000,
      frequency: "weekly",
      nextPayoutTimestamp: now + 2 * 86400 + 4 * 3600,
      status: "active",
      history: [
        { signature: "5a1b...", timestamp: now - 7 * 86400, amount: 420_000_000, scoreDelta: 10 },
        { signature: "7c2d...", timestamp: now - 14 * 86400, amount: 420_000_000, scoreDelta: 10 },
      ],
    },
    {
      pda: "3fGh8nM2pLq9wXr4tYz5vC1bN6jK0sD7eR3aQ2xZ1mP4",
      payer: walletAddress,
      payee: "8wXr4tYz5vC1bN6jK0sD7eR3aQ2xZ1mP4fGh8nM2pLq9",
      amount: 180_000_000,
      frequency: "biweekly",
      nextPayoutTimestamp: now - 3600,
      status: "due",
      history: [
        { signature: "9e4f...", timestamp: now - 14 * 86400, amount: 180_000_000, scoreDelta: 10 },
      ],
    },
    {
      pda: "1mP4fGh8nM2pLq9wXr4tYz5vC1bN6jK0sD7eR3aQ2xZ1",
      payer: walletAddress,
      payee: "6jK0sD7eR3aQ2xZ1mP4fGh8nM2pLq9wXr4tYz5vC1bN6",
      amount: 600_000_000,
      frequency: "monthly",
      nextPayoutTimestamp: now - 30 * 86400,
      status: "completed",
      history: [
        { signature: "2g5h...", timestamp: now - 30 * 86400, amount: 600_000_000, scoreDelta: 10 },
      ],
    },
  ];
}

export function useContracts() {
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();

  return useQuery({
    queryKey: ["contracts", address],
    queryFn: () => fetchContracts(address as string),
    enabled: !!address,
  });
}

export function useContract(pda: string) {
  const { data: contracts, ...rest } = useContracts();
  const contract = contracts?.find((c) => c.pda === pda);
  return { data: contract, ...rest };
}
