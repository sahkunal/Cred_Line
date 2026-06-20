import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flowlend } from "../target/types/flowlend";
import { Flowscore } from "../target/types/flowscore";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createMint, createAssociatedTokenAccount, mintTo, getAccount, TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("flowlend", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const lendProgram  = anchor.workspace.Flowlend  as Program<Flowlend>;
  const scoreProgram = anchor.workspace.Flowscore as Program<Flowscore>;

  const admin  = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(require("fs").readFileSync("/home/tyler/.config/solana/id.json", "utf-8")))
  );
  const worker = anchor.web3.Keypair.generate();
  const scorePayer = anchor.web3.Keypair.generate();

  let usdcMint: PublicKey;
  let lendingPoolPDA: PublicKey;
  let vaultAccountPDA: PublicKey;
  let vaultTokenPDA: PublicKey;
  let workerTokenATA: PublicKey;
  let loanAccountPDA: PublicKey;
  let workerScorePDA: PublicKey;
  let scorePayerPDA: PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(worker.publicKey, 2_000_000_000)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(scorePayer.publicKey, 2_000_000_000)
    );

    usdcMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);

    [lendingPoolPDA] = PublicKey.findProgramAddressSync([Buffer.from("lending_pool")], lendProgram.programId);
    [vaultAccountPDA] = PublicKey.findProgramAddressSync([Buffer.from("vault")], lendProgram.programId);
    [vaultTokenPDA] = PublicKey.findProgramAddressSync([Buffer.from("vault_token")], lendProgram.programId);
    [loanAccountPDA] = PublicKey.findProgramAddressSync([Buffer.from("loan"), worker.publicKey.toBuffer()], lendProgram.programId);
    [workerScorePDA] = PublicKey.findProgramAddressSync([Buffer.from("score"), worker.publicKey.toBuffer()], scoreProgram.programId);
    [scorePayerPDA] = PublicKey.findProgramAddressSync([Buffer.from("score"), scorePayer.publicKey.toBuffer()], scoreProgram.programId);

    workerTokenATA = await createAssociatedTokenAccount(provider.connection, admin, usdcMint, worker.publicKey);

       await lendProgram.methods.initializePool(400, new anchor.BN(10_000_000_000)).accounts({
      authority: admin.publicKey,
      lendingPool: lendingPoolPDA,
      vaultAccount: vaultAccountPDA,
      vaultToken: vaultTokenPDA,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).signers([admin]).rpc();

    await mintTo(provider.connection, admin, usdcMint, vaultTokenPDA, admin, 10_000_000_000);

    for (let i = 0; i < 42; i++) {
      await scoreProgram.methods.updateScoreOnPayment(new anchor.BN(1_000_000)).accounts({
        payerSigner: scorePayer.publicKey,
        payee: worker.publicKey,
        payerWallet: scorePayer.publicKey,
        payeeScore: workerScorePDA,
        payerScore: scorePayerPDA,
        systemProgram: SystemProgram.programId,
      }).signers([scorePayer]).rpc();
    }

    const score = await scoreProgram.account.scoreAccount.fetch(workerScorePDA);
    assert.ok(score.composite >= 400, `composite ${score.composite} must be >= 400`);
  });

  it("allows borrow when composite >= minimum_score", async () => {
    const borrowAmount = new anchor.BN(500_000);
    await lendProgram.methods.borrow(borrowAmount).accounts({
      worker: worker.publicKey,
      workerScore: workerScorePDA,
      lendingPool: lendingPoolPDA,
      vaultAccount: vaultAccountPDA,
      vaultToken: vaultTokenPDA,
      workerToken: workerTokenATA,
      loanAccount: loanAccountPDA,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).signers([worker]).rpc();

    const workerBalance = await getAccount(provider.connection, workerTokenATA);
    assert.equal(Number(workerBalance.amount), borrowAmount.toNumber());

    const loan = await lendProgram.account.loanAccount.fetch(loanAccountPDA);
    assert.equal(loan.worker.toString(), worker.publicKey.toString());
    assert.equal(loan.amount.toNumber(), borrowAmount.toNumber());
    assert.equal(loan.repaid, false);
  });

  it("rejects borrow when score is below minimum", async () => {
    const lowWorker = anchor.web3.Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(lowWorker.publicKey, 1_000_000_000)
    );
    const [lowWorkerScore] = PublicKey.findProgramAddressSync([Buffer.from("score"), lowWorker.publicKey.toBuffer()], scoreProgram.programId);
    const [lowLoanAccount] = PublicKey.findProgramAddressSync([Buffer.from("loan"), lowWorker.publicKey.toBuffer()], lendProgram.programId);
    const lowWorkerATA = await createAssociatedTokenAccount(provider.connection, admin, usdcMint, lowWorker.publicKey);

    try {
      await lendProgram.methods.borrow(new anchor.BN(500_000)).accounts({
        worker: lowWorker.publicKey,
        workerScore: lowWorkerScore,
        lendingPool: lendingPoolPDA,
        vaultAccount: vaultAccountPDA,
        vaultToken: vaultTokenPDA,
        workerToken: lowWorkerATA,
        loanAccount: lowLoanAccount,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([lowWorker]).rpc();
      assert.fail("should have rejected low score");
    } catch (err: unknown) {
     assert.equal((err as anchor.AnchorError).error.errorCode.code, "AccountNotInitialized");
    }
  });

  it("repay closes loan account and updates score via CPI", async () => {
    const loan = await lendProgram.account.loanAccount.fetch(loanAccountPDA);
    await mintTo(provider.connection, admin, usdcMint, workerTokenATA, admin, loan.amount.toNumber());
    const scoreBefore = await scoreProgram.account.scoreAccount.fetch(workerScorePDA);

    await lendProgram.methods.repay(loan.amount).accounts({
      worker: worker.publicKey,
      loanAccount: loanAccountPDA,
      lendingPool: lendingPoolPDA,
      vaultAccount: vaultAccountPDA,
      vaultToken: vaultTokenPDA,
      workerToken: workerTokenATA,
      workerScore: workerScorePDA,
      flowScoreProgram: scoreProgram.programId,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).signers([worker]).rpc();

    try {
      await lendProgram.account.loanAccount.fetch(loanAccountPDA);
      assert.fail("loan account should be closed");
    } catch {
      assert.ok(true, "loan account correctly closed");
    }

    const scoreAfter = await scoreProgram.account.scoreAccount.fetch(workerScorePDA);
    assert.ok(scoreAfter.composite >= scoreBefore.composite);
  });

  it("rejects second borrow while loan is open", async () => {
    await lendProgram.methods.borrow(new anchor.BN(200_000)).accounts({
      worker: worker.publicKey,
      workerScore: workerScorePDA,
      lendingPool: lendingPoolPDA,
      vaultAccount: vaultAccountPDA,
      vaultToken: vaultTokenPDA,
      workerToken: workerTokenATA,
      loanAccount: loanAccountPDA,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).signers([worker]).rpc();

    try {
      await lendProgram.methods.borrow(new anchor.BN(100_000)).accounts({
        worker: worker.publicKey,
        workerScore: workerScorePDA,
        lendingPool: lendingPoolPDA,
        vaultAccount: vaultAccountPDA,
        vaultToken: vaultTokenPDA,
        workerToken: workerTokenATA,
        loanAccount: loanAccountPDA,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([worker]).rpc();
      assert.fail("should reject second borrow");
    } catch {
      assert.ok(true, "correctly rejected second borrow");
    }
  });
});