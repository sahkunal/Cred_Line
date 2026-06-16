import { PublicKey } from "@solana/web3.js";
import {
  FLOWPAY_PROGRAM_ID,
  FLOWSCORE_PROGRAM_ID,
  FLOWBADGE_PROGRAM_ID,
  FLOWLEND_PROGRAM_ID,
} from "./program-ids";

/**
 * PDA derivation helpers matching the seed conventions in the
 * Cred_Line Anchor programs:
 *   FlowPay:   ["flowpay", payer, payee]
 *   FlowScore: ["score", wallet]
 *   FlowBadge: ["badge", wallet]
 *   FlowLend:  ["loan", wallet]
 *   Pool:      ["pool"]
 *
 * NOTE: confirm these match the exact `seeds = [...]` definitions
 * in each program's #[derive(Accounts)] structs before relying on
 * these in production. Order and types (Pubkey vs bytes) matter.
 */

export function deriveFlowPayContractPda(
  payer: PublicKey,
  payee: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("flowpay"), payer.toBuffer(), payee.toBuffer()],
    FLOWPAY_PROGRAM_ID
  );
}

export function deriveScoreAccountPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("score"), wallet.toBuffer()],
    FLOWSCORE_PROGRAM_ID
  );
}

export function deriveBadgeAccountPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("badge"), wallet.toBuffer()],
    FLOWBADGE_PROGRAM_ID
  );
}

export function deriveLoanAccountPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("loan"), wallet.toBuffer()],
    FLOWLEND_PROGRAM_ID
  );
}

export function derivePoolPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    FLOWLEND_PROGRAM_ID
  );
}
