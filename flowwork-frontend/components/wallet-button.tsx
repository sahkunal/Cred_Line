"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { AddressDisplay } from "@/components/address-display";

export function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    return (
      <button
        onClick={() => disconnect()}
        className="glass glass-hover rounded-xl px-3 py-2 flex items-center gap-2 transition-colors"
      >
        <AddressDisplay address={publicKey.toBase58()} showAvatar size="sm" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="rounded-xl px-4 py-2 text-sm font-medium font-display text-background bg-flow-gradient hover:opacity-90 transition-opacity shrink-0"
    >
      Connect wallet
    </button>
  );
}
