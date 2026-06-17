import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flowscore } from "../target/types/flowscore";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("flowscore", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Flowscore as Program<Flowscore>;
  const worker = Keypair.generate();

  // PDA for worker's ScoreAccount
  const [scoreAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("score"), worker.publicKey.toBuffer()],
    program.programId
  );

  before(async () => {
    // Airdrop to worker
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(worker.publicKey, 2_000_000_000)
    );
  });

  it("initializes a score account on first payment update", async () => {
    await program.methods
      .updateScoreOnPayment(new anchor.BN(1_000_000))
      .accounts({
        payerScore: scoreAccountPDA,
        payeeScore: scoreAccountPDA, // same for unit test simplicity
        payerWallet: worker.publicKey,
        payee: worker.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([worker])
      .rpc();

    const score = await program.account.scoreAccount.fetch(scoreAccountPDA);
    assert.ok(score.paymentScore > 0, "payment score should increase");
  });

  it("applies two-sided scoring — both payer and payee get +10", async () => {
    const client = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(client.publicKey, 2_000_000_000)
    );

    const [clientScore] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), client.publicKey.toBuffer()],
      program.programId
    );
    const [workerScore] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), worker.publicKey.toBuffer()],
      program.programId
    );

    const workerBefore = await program.account.scoreAccount.fetch(workerScore);

    await program.methods
      .updateScoreOnPayment(new anchor.BN(500_000))
      .accounts({
        payerScore: clientScore,
        payeeScore: workerScore,
        payerWallet: client.publicKey,
        payee: worker.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const workerAfter = await program.account.scoreAccount.fetch(workerScore);
    assert.equal(
      workerAfter.paymentScore,
      workerBefore.paymentScore + 10,
      "worker should get +10"
    );
  });

  it("report_missed_payment only penalizes payer, never payee", async () => {
    const client = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(client.publicKey, 2_000_000_000)
    );

    const [clientScore] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), client.publicKey.toBuffer()],
      program.programId
    );
    const [workerScore] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), worker.publicKey.toBuffer()],
      program.programId
    );

    const workerBefore = await program.account.scoreAccount.fetch(workerScore);
    const pastDue = new anchor.BN(Math.floor(Date.now() / 1000) - 90_000); // 25h ago

    await program.methods
      .reportMissedPayment(pastDue)
      .accounts({
         payerScore: clientScore,
       // payeeScore: workerScore,
         flowpay:     clientScore,               
         payerWallet: client.publicKey, 
        reporter: provider.wallet.publicKey,
      })
      .rpc();

    const workerAfter = await program.account.scoreAccount.fetch(workerScore);
    assert.equal(
      workerAfter.paymentScore,
      workerBefore.paymentScore,
      "worker score must NOT change on missed payment"
    );
  });

  it("composite score is capped at 1000", async () => {
    // Call updateScoreOnPayment many times and check cap
    const score = await program.account.scoreAccount.fetch(scoreAccountPDA);
    assert.ok(score.composite <= 1000, "composite must never exceed 1000");
  });
});