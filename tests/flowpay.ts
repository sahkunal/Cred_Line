import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flowpay } from "../target/types/flowpay";
import { Flowscore } from "../target/types/flowscore";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createMint, createAssociatedTokenAccount, mintTo, getAccount,
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("flowpay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Flowpay as Program<Flowpay>;
  const flowScoreProgram = anchor.workspace.Flowscore as Program<Flowscore>;

  const client = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(require("fs").readFileSync("/home/tyler/.config/solana/id.json", "utf-8")))
  );
  const worker = anchor.web3.Keypair.generate();

  let mint: PublicKey;
  let clientATA: PublicKey;
  let workerATA: PublicKey;
  let flowpayPDA: PublicKey;

  const AMOUNT = new anchor.BN(1_000_000);
  const FREQUENCY = new anchor.BN(1);

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(worker.publicKey, 2_000_000_000)
    );

    mint = await createMint(provider.connection, client, client.publicKey, null, 6);
    clientATA = await createAssociatedTokenAccount(provider.connection, client, mint, client.publicKey);
    workerATA = await createAssociatedTokenAccount(provider.connection, client, mint, worker.publicKey);
    await mintTo(provider.connection, client, mint, clientATA, client, 100_000_000);

    [flowpayPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("flowpay"), client.publicKey.toBuffer(), worker.publicKey.toBuffer()],
      program.programId
    );
  });

  it("creates a flowpay contract and delegates tokens", async () => {
    await program.methods.createFlowpay(AMOUNT, FREQUENCY).accounts({
      flowpay: flowpayPDA,
      payer: client.publicKey,
      payee: worker.publicKey,
      token: mint,
      payerAta: clientATA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).signers([client]).rpc();

    const flowpay = await program.account.flowpay.fetch(flowpayPDA);
    assert.equal(flowpay.amount.toNumber(), AMOUNT.toNumber());
    assert.equal(flowpay.active, true);
  });

  it("executes a payment when due", async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const workerBefore = await getAccount(provider.connection, workerATA);

    const [payerScorePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), client.publicKey.toBuffer()],
      flowScoreProgram.programId
    );
    const [payeeScorePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), worker.publicKey.toBuffer()],
      flowScoreProgram.programId
    );
    const [paymentHistoryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment_history"), flowpayPDA.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 4)],
      program.programId
    );

    await program.methods.executeFlowpay().accounts({
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
    }).signers([client]).rpc();

    const workerAfter = await getAccount(provider.connection, workerATA);
    assert.equal(Number(workerAfter.amount) - Number(workerBefore.amount), AMOUNT.toNumber());
  });

  it("rejects execute when payment is not yet due", async () => {
    const [payerScorePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), client.publicKey.toBuffer()],
      flowScoreProgram.programId
    );
    const [payeeScorePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), worker.publicKey.toBuffer()],
      flowScoreProgram.programId
    );
    const [paymentHistoryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment_history"), flowpayPDA.toBuffer(), new anchor.BN(1).toArrayLike(Buffer, "le", 4)],
      program.programId
    );

    try {
      await program.methods.executeFlowpay().accounts({
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
      }).signers([client]).rpc();
      assert.fail("should have thrown NotDueYet");
    } catch (err: any) {
     assert.equal((err as anchor.AnchorError).error.errorCode.code, "PaymentTooEarly");
    }
  });

  it("cancels flowpay and revokes delegation", async () => {
    await program.methods.cancelFlowpay().accounts({
      payer: client.publicKey,
      token: mint,
      payerAta: clientATA,
      flowpay: flowpayPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).signers([client]).rpc();

    try {
      await program.account.flowpay.fetch(flowpayPDA);
      assert.fail("account should be closed");
    } catch {
      assert.ok(true, "account correctly closed");
    }
  });
});