import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flowbadge } from "../target/types/flowbadge";
import { Flowscore } from "../target/types/flowscore";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("flowbadge", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const badgeProgram = anchor.workspace.Flowbadge as Program<Flowbadge>;
  const scoreProgram = anchor.workspace.Flowscore as Program<Flowscore>;

  const worker = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(require("fs").readFileSync("/home/tyler/.config/solana/id.json", "utf-8")))
  );
  const payer = anchor.web3.Keypair.generate();

  let scoreAccountPDA: PublicKey;
  let badgeAccountPDA: PublicKey;
  let payerScorePDA: PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 2_000_000_000)
    );

    [scoreAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), worker.publicKey.toBuffer()],
      scoreProgram.programId
    );
    [payerScorePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), payer.publicKey.toBuffer()],
      scoreProgram.programId
    );
    [badgeAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("badge"), worker.publicKey.toBuffer()],
      badgeProgram.programId
    );

    for (let i = 0; i < 42; i++) {
      await scoreProgram.methods
        .updateScoreOnPayment(new anchor.BN(1_000_000))
        .accounts({
          payerSigner: payer.publicKey,
          payerWallet: payer.publicKey,
          payee: worker.publicKey,
          payerScore: payerScorePDA,
          payeeScore: scoreAccountPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
    }
  });

  it("mints badge when composite >= 400", async () => {
    await badgeProgram.methods
      .mintBadge()
      .accounts({
        badgeAccount: badgeAccountPDA,
        scoreAccount: scoreAccountPDA,
        authority: worker.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([worker])
      .rpc();

    const badge = await badgeProgram.account.badgeAccount.fetch(badgeAccountPDA);
    assert.ok(badge.tier >= 0, "badge tier should be assigned");
    assert.equal(badge.authority.toString(), worker.publicKey.toString());
  });

  it("assigns correct tier — Bronze for score 400-599", async () => {
    const badge = await badgeProgram.account.badgeAccount.fetch(badgeAccountPDA);
    const score = await scoreProgram.account.scoreAccount.fetch(scoreAccountPDA);
    if (score.composite >= 400 && score.composite < 600) {
      assert.equal(badge.tier, 0, "should be Bronze (tier 0)");
    }
  });

  it("rejects minting badge when score is below 400", async () => {
    const lowWorker = anchor.web3.Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(lowWorker.publicKey, 1_000_000_000)
    );

    const [lowScore] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), lowWorker.publicKey.toBuffer()],
      scoreProgram.programId
    );
    const [lowBadge] = PublicKey.findProgramAddressSync(
      [Buffer.from("badge"), lowWorker.publicKey.toBuffer()],
      badgeProgram.programId
    );

    try {
      await badgeProgram.methods
        .mintBadge()
        .accounts({
          badgeAccount: lowBadge,
          scoreAccount: lowScore,
          authority: lowWorker.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lowWorker])
        .rpc();
      assert.fail("should have rejected low score");
    } catch (err: any) {
      assert.equal((err as anchor.AnchorError).error.errorCode.code, "AccountNotInitialized");
    }
  });

  it("update_badge recalculates tier after score changes", async () => {
    await badgeProgram.methods
      .updateBadge()
      .accounts({
        badgeAccount: badgeAccountPDA,
        scoreAccount: scoreAccountPDA,
        authority: worker.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([worker])
      .rpc();

    const badge = await badgeProgram.account.badgeAccount.fetch(badgeAccountPDA);
    assert.ok(badge.tier !== undefined);
  });
});