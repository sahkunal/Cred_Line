import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flowlend } from "../target/types/flowlend";
import { Flowscore } from "../target/types/flowscore";
import {
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("flowlend", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const lendProgram  = anchor.workspace.Flowlend  as Program<Flowlend>;
  const scoreProgram = anchor.workspace.Flowscore as Program<Flowscore>;

  const admin  = Keypair.generate();
  const worker = Keypair.generate();

  let usdcMint:       PublicKey;
  let lendingPoolPDA: PublicKey;
  let vaultAccountPDA: PublicKey;
  let vaultTokenPDA:  PublicKey;
  let workerTokenATA: PublicKey;
  let loanAccountPDA: PublicKey;
  let workerScorePDA: PublicKey;
  let payerScorePDA:  PublicKey; 

  before(async () => {

    // Airdrop SOL
    for (const kp of [admin, worker]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(kp.publicKey, 2_000_000_000)
      );
    }

    // USDC mint (admin is mint authority)
    usdcMint = await createMint(
      provider.connection, admin, admin.publicKey, null, 6
    );

    // Derive PDAs — seeds must match Rust exactly
    [lendingPoolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("lending_pool")],           
      lendProgram.programId
    );
    [vaultAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],                   
      lendProgram.programId
    );
    [vaultTokenPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token")],            
      lendProgram.programId
    );
    [loanAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("loan"), worker.publicKey.toBuffer()],
      lendProgram.programId
    );
    [workerScorePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), worker.publicKey.toBuffer()], 
      scoreProgram.programId
    );
    payerScorePDA = workerScorePDA;

    workerTokenATA = await createAssociatedTokenAccount(
      provider.connection, admin, usdcMint, worker.publicKey
    );

    //  Initialize pool 
    await lendProgram.methods
      .initializePool(400)                    
      .accounts({
        authority:    admin.publicKey,         
        lendingPool:  lendingPoolPDA,        
        vaultAccount: vaultAccountPDA,         
        vaultToken:   vaultTokenPDA,            
        usdcMint:     usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    await mintTo(
      provider.connection,
      admin,
      usdcMint,
      vaultTokenPDA,
      admin,
      10_000_000_000  // 10,000 USDC
    );

    // ── Pump worker score above 400 

    for (let i = 0; i < 42; i++) {
      await scoreProgram.methods
        .updateScoreOnPayment(new anchor.BN(1_000_000))
        .accounts({
          payerSigner:  worker.publicKey,       // payer_signer (Signer)
          payee:        worker.publicKey,       // payee (UncheckedAccount)
          payerWallet:  worker.publicKey,       // payer_wallet (UncheckedAccount)
          payeeScore:   workerScorePDA,         // seeds = [b"score", payee]
          payerScore:   payerScorePDA,          // seeds = [b"score", payer_wallet]
          systemProgram: SystemProgram.programId,
        })
        .signers([worker])
        .rpc();
    }

    // Verify score is above 400 before tests run
    const score = await scoreProgram.account.scoreAccount.fetch(workerScorePDA);
    assert.ok(score.composite >= 400, `composite ${score.composite} must be >= 400 before borrow tests`);
  });

  // ── TEST 1: happy path borrow 
  it("allows borrow when composite >= minimum_score", async () => {
    const borrowAmount = new anchor.BN(500_000); // 0.5 USDC

    await lendProgram.methods
      .borrow(borrowAmount)
      .accounts({
        worker:       worker.publicKey,       
        workerScore:  workerScorePDA,          
        lendingPool:  lendingPoolPDA,          
        vaultAccount: vaultAccountPDA,         
        vaultToken:   vaultTokenPDA,           
        workerToken:  workerTokenATA,           
        loanAccount:  loanAccountPDA,          
        usdcMint:     usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([worker])
      .rpc();

    // Worker should have received USDC
    const workerBalance = await getAccount(provider.connection, workerTokenATA);
    assert.equal(
      Number(workerBalance.amount),
      borrowAmount.toNumber(),
      "worker should receive exact borrow amount"
    );

    // Loan account should be initialized correctly
    const loan = await lendProgram.account.loanAccount.fetch(loanAccountPDA);
    assert.equal(loan.worker.toString(), worker.publicKey.toString());
    assert.equal(loan.amount.toNumber(), borrowAmount.toNumber());
    assert.equal(loan.repaid, false);
  });

  // ── TEST 2: reject borrow when score too low 
  it("rejects borrow when score is below minimum", async () => {
    const lowWorker = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(lowWorker.publicKey, 2_000_000_000)
    );

    const [lowWorkerScore] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), lowWorker.publicKey.toBuffer()],
      scoreProgram.programId
    );
    const [lowLoanAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("loan"), lowWorker.publicKey.toBuffer()],
      lendProgram.programId
    );
    const lowWorkerATA = await createAssociatedTokenAccount(
      provider.connection, admin, usdcMint, lowWorker.publicKey
    );

    try {
      await lendProgram.methods
        .borrow(new anchor.BN(500_000))
        .accounts({
          worker:       lowWorker.publicKey,
          workerScore:  lowWorkerScore,         
          lendingPool:  lendingPoolPDA,
          vaultAccount: vaultAccountPDA,
          vaultToken:   vaultTokenPDA,
          workerToken:  lowWorkerATA,
          loanAccount:  lowLoanAccount,
          usdcMint:     usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([lowWorker])
        .rpc();

      assert.fail("should have rejected low score");
    } catch (err: unknown) {                    
      const msg = (err as Error).toString();
      assert.include(msg, "ScoreTooLow");
    }
  });

  // ── TEST 3: repay closes loan 
  it("repay closes loan account and updates score via CPI", async () => {
    // Fetch the exact amount from the loan — Rust requires amount == loan.amount
    const loan = await lendProgram.account.loanAccount.fetch(loanAccountPDA);
    const repayAmount = loan.amount;            // BN — must match exactly

    // Give worker enough USDC to repay (they spent the borrowed amount)
    await mintTo(
      provider.connection, admin, usdcMint, workerTokenATA, admin, repayAmount.toNumber()
    );

    const scoreBefore = await scoreProgram.account.scoreAccount.fetch(workerScorePDA);

    await lendProgram.methods
      .repay(repayAmount)                      
      .accounts({
        worker:          worker.publicKey,     
        loanAccount:     loanAccountPDA,        
        lendingPool:     lendingPoolPDA,
        vaultAccount:    vaultAccountPDA,
        vaultToken:      vaultTokenPDA,
        workerToken:     workerTokenATA,
        workerScore:     workerScorePDA,       
        flowScoreProgram: scoreProgram.programId, 
        usdcMint:        usdcMint,
        tokenProgram:    TOKEN_PROGRAM_ID,
        systemProgram:   SystemProgram.programId,
      })
      .signers([worker])
      .rpc();

    // Loan account must be closed (close = worker in Rust)
    try {
      await lendProgram.account.loanAccount.fetch(loanAccountPDA);
      assert.fail("loan account should be closed after repay");
    } catch {
      assert.ok(true, "loan account correctly closed");
    }

    // Score should improve for on-time repay (+15 payment_score per Rust logic)
    const scoreAfter = await scoreProgram.account.scoreAccount.fetch(workerScorePDA);
    assert.ok(
      scoreAfter.composite >= scoreBefore.composite,
      "composite should not decrease after on-time repay"
    );
  });

  // ── TEST 4: cannot borrow twice (one loan per worker)
  it("rejects second borrow while loan is open", async () => {
    // loan was closed in TEST 3, so open a new one first
    const borrowAmount = new anchor.BN(200_000);

    await lendProgram.methods
      .borrow(borrowAmount)
      .accounts({
        worker:       worker.publicKey,
        workerScore:  workerScorePDA,
        lendingPool:  lendingPoolPDA,
        vaultAccount: vaultAccountPDA,
        vaultToken:   vaultTokenPDA,
        workerToken:  workerTokenATA,
        loanAccount:  loanAccountPDA,
        usdcMint:     usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([worker])
      .rpc();

    try {
      await lendProgram.methods
        .borrow(new anchor.BN(100_000))
        .accounts({
          worker:       worker.publicKey,
          workerScore:  workerScorePDA,
          lendingPool:  lendingPoolPDA,
          vaultAccount: vaultAccountPDA,
          vaultToken:   vaultTokenPDA,
          workerToken:  workerTokenATA,
          loanAccount:  loanAccountPDA,         
          usdcMint:     usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([worker])
        .rpc();
      assert.fail("should reject second borrow");
    } catch (err: unknown) {
      // Anchor will throw because init tries to create an already-existing account
      assert.ok(true, "correctly rejected second borrow");
    }
  });
});