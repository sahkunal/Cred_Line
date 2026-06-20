import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flowscore } from "../target/types/flowscore";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("flowscore", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Flowscore as Program<Flowscore>;

  const worker = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(require("fs").readFileSync("/home/tyler/.config/solana/id.json", "utf-8")))
  );
  const client = anchor.web3.Keypair.generate();

  const [workerScorePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("score"), worker.publicKey.toBuffer()],
    program.programId
  );
  const [clientScorePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("score"), client.publicKey.toBuffer()],
    program.programId
  );

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(client.publicKey, 2_000_000_000)
    );
  });

  it("initializes a score account on first payment update", async () => {
    await program.methods
      .updateScoreOnPayment(new anchor.BN(1_000_000))
      .accounts({
        payerSigner: worker.publicKey,
        payerWallet: worker.publicKey,
        payee: client.publicKey,
        payerScore: workerScorePDA,
        payeeScore: clientScorePDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([worker])
      .rpc();

    const score = await program.account.scoreAccount.fetch(workerScorePDA);
    assert.ok(score.paymentScore > 0, "payment score should increase");
  });

  it("applies two-sided scoring — both payer and payee get +10", async () => {
    const workerBefore = await program.account.scoreAccount.fetch(workerScorePDA);

    await program.methods
      .updateScoreOnPayment(new anchor.BN(500_000))
      .accounts({
        payerSigner: client.publicKey,
        payerWallet: client.publicKey,
        payee: worker.publicKey,
        payerScore: clientScorePDA,
        payeeScore: workerScorePDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const workerAfter = await program.account.scoreAccount.fetch(workerScorePDA);
    assert.equal(
      workerAfter.paymentScore,
      workerBefore.paymentScore + 10,
      "worker should get +10"
    );
  });

  it("report_missed_payment only penalizes payer, never payee", async () => {
    const workerBefore = await program.account.scoreAccount.fetch(workerScorePDA);
    const pastDue = new anchor.BN(Math.floor(Date.now() / 1000) - 90_000);

    await program.methods
      .reportMissedPayment(pastDue)
      .accounts({
        payerScore: clientScorePDA,
        flowpay: clientScorePDA,
        payerWallet: client.publicKey,
        reporter: provider.wallet.publicKey,
      })
      .rpc();

    const workerAfter = await program.account.scoreAccount.fetch(workerScorePDA);
    assert.equal(
      workerAfter.paymentScore,
      workerBefore.paymentScore,
      "worker score must NOT change on missed payment"
    );
  });

  it("composite score is capped at 1000", async () => {
    const score = await program.account.scoreAccount.fetch(workerScorePDA);
    assert.ok(score.composite <= 1000, "composite must never exceed 1000");
  });
});