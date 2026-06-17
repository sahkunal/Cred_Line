import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flowpay } from "../target/types/flowpay";
import { Flowscore } from "../target/types/flowscore";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("flowpay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Flowpay as Program<Flowpay>;
  const flowScoreProgram = anchor.workspace.Flowscore as Program<Flowscore>;
  let mint: PublicKey;
  let clientATA: PublicKey;
  let workerATA: PublicKey;
  const client = Keypair.generate();
  const worker = Keypair.generate();

  // PDAs
  let flowpayPDA: PublicKey;

  const AMOUNT = new anchor.BN(1_000_000);        // 1 USDC (6 decimals)
  const FREQUENCY = new anchor.BN(60);            // 60 seconds for testing

  before(async () => {
    // Fund wallets
    for (const kp of [client, worker]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(kp.publicKey, 2_000_000_000)
      );
    }

    // Create mint
    mint = await createMint(
      provider.connection,
      client,           // payer
      client.publicKey, // mint authority
      null,
      6
    );

    // Create ATAs
    clientATA = await createAssociatedTokenAccount(
      provider.connection, client, mint, client.publicKey
    );
    workerATA = await createAssociatedTokenAccount(
      provider.connection, client, mint, worker.publicKey
    );

    // Mint tokens to client
    await mintTo(
      provider.connection, client, mint, clientATA, client, 100_000_000
    );

    // Derive PDAs
    [flowpayPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("flowpay"), client.publicKey.toBuffer(), worker.publicKey.toBuffer()],
      program.programId
    );
  });

  it("creates a flowpay contract and delegates tokens", async () => {
    await program.methods
      .createFlowpay(AMOUNT, FREQUENCY)
      .accounts({
  flowpay: flowpayPDA,
  payer: client.publicKey,
  payee: worker.publicKey,
  token: mint,
  payerAta: clientATA,
  tokenProgram: TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
})
      .signers([client])
      .rpc();

    const flowpay = await program.account.flowpay.fetch(flowpayPDA);
    assert.equal(flowpay.amount.toNumber(), AMOUNT.toNumber());
    assert.equal(flowpay.active, true);
  });

  it("executes a payment when due", async () => {
  const workerBefore = await getAccount(provider.connection, workerATA);

  // FlowScore PDAs
  const [payerScorePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("score"), client.publicKey.toBuffer()],
    flowScoreProgram.programId
  );

  const [payeeScorePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("score"), worker.publicKey.toBuffer()],
    flowScoreProgram.programId
  );

  // payment history PDA
  const [paymentHistoryPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_history"),
      flowpayPDA.toBuffer(),
      new anchor.BN(0).toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  await program.methods
    .executeFlowpay()
    .accounts({
      signer: client.publicKey,

      payer: client.publicKey,
      payerAta: clientATA,

      payee: worker.publicKey,
      payeeAta: workerATA,

      flowpay: flowpayPDA,
      paymentHistory: paymentHistoryPDA,

      token: mint,

      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,

      flowScoreProgram: flowScoreProgram.programId,

      payeeScore: payeeScorePDA,
      payerScore: payerScorePDA,
    })
    .signers([client])
    .rpc();

  const workerAfter = await getAccount(provider.connection, workerATA);

  assert.equal(
    Number(workerAfter.amount) - Number(workerBefore.amount),
    AMOUNT.toNumber(),
    "worker should receive exact payment amount"
  );
});

  it("rejects execute when payment is not yet due", async () => {
    // Just executed — calling again immediately should fail
    try {
      await program.methods
        .executeFlowpay()
        .accounts({
  flowpay: flowpayPDA,
  payer: client.publicKey,
  payee: worker.publicKey,
  token: mint,
  payerAta: clientATA,
  tokenProgram: TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
})
        .rpc();
      assert.fail("should have thrown NotDueYet");
    } catch (err:any) {
      assert.include(err.toString(), "NotDueYet");
    }
  });

  it("cancels flowpay and revokes delegation", async () => {
    await program.methods
      .cancelFlowpay()
      .accounts({
  payer: client.publicKey,
  token: mint,
  payerAta: clientATA,
  flowpay: flowpayPDA,
  tokenProgram: TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
})
      .signers([client])
      .rpc();

    // Account should be closed (will throw on fetch)
    try {
      await program.account.flowpay.fetch(flowpayPDA);
      assert.fail("account should be closed");
    } catch {
      assert.ok(true, "account correctly closed");
    }
  });
});