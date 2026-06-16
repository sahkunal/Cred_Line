import { PublicKey } from "@solana/web3.js";

/**
 * Deployed program addresses for the FlowWork protocol.
 * Replace these with your actual devnet/mainnet program IDs once
 * deployed (see `anchor keys list` in the Cred_Line repo), via
 * .env.local:
 *   NEXT_PUBLIC_FLOWPAY_PROGRAM_ID=...
 *   NEXT_PUBLIC_FLOWSCORE_PROGRAM_ID=...
 *   NEXT_PUBLIC_FLOWBADGE_PROGRAM_ID=...
 *   NEXT_PUBLIC_FLOWLEND_PROGRAM_ID=...
 *
 * The fallback below is the System Program ID — a valid base58 key
 * used only so the app doesn't crash before real IDs are set. It is
 * NOT a real FlowWork program and will fail any real on-chain call.
 */
const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

function resolveProgramId(envValue: string | undefined): PublicKey {
  try {
    return new PublicKey(envValue ?? PLACEHOLDER_PROGRAM_ID);
  } catch {
    return new PublicKey(PLACEHOLDER_PROGRAM_ID);
  }
}

export const FLOWPAY_PROGRAM_ID = resolveProgramId(
  process.env.NEXT_PUBLIC_FLOWPAY_PROGRAM_ID
);

export const FLOWSCORE_PROGRAM_ID = resolveProgramId(
  process.env.NEXT_PUBLIC_FLOWSCORE_PROGRAM_ID
);

export const FLOWBADGE_PROGRAM_ID = resolveProgramId(
  process.env.NEXT_PUBLIC_FLOWBADGE_PROGRAM_ID
);

export const FLOWLEND_PROGRAM_ID = resolveProgramId(
  process.env.NEXT_PUBLIC_FLOWLEND_PROGRAM_ID
);

/** RPC endpoint, defaults to devnet */
export const SOLANA_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT ??
  "https://api.devnet.solana.com";
