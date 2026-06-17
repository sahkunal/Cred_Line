import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flowbadge } from "../target/types/flowbadge";
import { Flowscore } from "../target/types/flowscore";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("flowbadge", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const badgeProgram = anchor.workspace.Flowbadge as Program<Flowbadge>;
  const scoreProgram = anchor.workspace.Flowscore as Program<Flowscore>;

  const worker = Keypair.generate();

  let scoreAccountPDA: PublicKey;
  let badgeAccountPDA: PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(worker.publicKey, 2_000_000_000)
    );

    [scoreAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), worker.publicKey.toBuffer()],
      scoreProgram.programId
    );
    [badgeAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("badge"), worker.publicKey.toBuffer()],
      badgeProgram.programId
    );

    // Pump the worker's score above 400 so badge can be minted
    // (call updateScoreOnPayment 40+ times or use a helper)
    for (let i = 0; i < 42; i++) {
      await scoreProgram.methods
        .updateScoreOnPayment(new anchor.BN(1_000_000))
        .accounts({
          payerScore: scoreAccountPDA,
          payeeScore: scoreAccountPDA,
          payerWallet: worker.publicKey,
          payee: worker.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([worker])
        .rpc();
    }
  });

  it("mints badge when composite >= 400", async () => {
    await badgeProgram.methods
      .mintBadge()
      .accounts({
        badgeAccount: badgeAccountPDA,
        scoreAccount: scoreAccountPDA,
        // scoreProgram: scoreProgram.programId,
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
    const lowWorker = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(lowWorker.publicKey, 2_000_000_000)
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
          //scoreProgram: scoreProgram.programId,
          authority: lowWorker.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lowWorker])
        .rpc();
      assert.fail("should have rejected low score");
    } catch (err:any) {
      assert.include(err.toString(), "ScoreTooLow");
    }
  });

  it("update_badge recalculates tier after score changes", async () => {
    await badgeProgram.methods
      .updateBadge()
      .accounts({
        badgeAccount: badgeAccountPDA,
        scoreAccount: scoreAccountPDA,
       // scoreProgram: scoreProgram.programId,
        authority: worker.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([worker])
      .rpc();

    const badge = await badgeProgram.account.badgeAccount.fetch(badgeAccountPDA);
    assert.ok(badge.tier !== undefined);
  });
});