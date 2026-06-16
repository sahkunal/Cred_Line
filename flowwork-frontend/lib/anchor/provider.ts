import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { SOLANA_RPC_ENDPOINT } from "./program-ids";

/**
 * Build an AnchorProvider from the connected wallet-adapter wallet.
 * Returns null if the wallet isn't connected yet.
 */
export function getAnchorProvider(
  wallet: WalletContextState
): AnchorProvider | null {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    return null;
  }

  const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

  return new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    },
    { commitment: "confirmed" }
  );
}
