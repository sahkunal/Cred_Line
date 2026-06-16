use litesvm::LiteSvm;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;

#[path = "helpers/mod.rs"]
mod helpers;
use helpers::*;

/// Spin up a fresh LiteSVM with FlowLend + FlowScore loaded.
fn setup() -> LiteSvm {
    let mut svm = LiteSvm::new();
    load_program(&mut svm, &flowlend::ID, "flowlend");
    load_program(&mut svm, &flowscore::ID, "flowscore");
    svm
}

#[test]
fn test_borrow_score_too_low() {
    let mut svm = setup();
    let worker = Keypair::new();
    svm.airdrop(&worker.pubkey(), 10_000_000_000).unwrap();

   
    let worker_score = score_pda(&worker.pubkey(), &flowscore::ID);
    let lending_pool = lending_pool_pda(&flowlend::ID);
    let vault_account = vault_pda(&flowlend::ID);
    let vault_token = vault_token_pda(&flowlend::ID);
    let loan_account = loan_pda(&worker.pubkey(), &flowlend::ID);

    let ix = flowlend::instruction::borrow(
        flowlend::ID,
        worker.pubkey(),
        worker_score,
        lending_pool,
        vault_account,
        vault_token,

        solana_pubkey::Pubkey::new_unique(),
        loan_account,
        solana_pubkey::Pubkey::new_unique(),
        spl_token::ID,
        solana_sdk_ids::system_program::ID,
        1_000_000, // amount
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&worker.pubkey()),
        &[&worker],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_err(), "borrow should fail — worker has no ScoreAccount");
}

// NOTE: the following scenarios require a fully-seeded LendingPool +
// VaultAccount + vault USDC token account + worker USDC ATA + an
// existing LoanAccount, plus a FlowScore ScoreAccount meeting
// `minimum_score`. This is the same SPL-token + multi-account bootstrap
// complexity as FlowPay's execute_flowpay, and is the kind of multi-step
// setup anchor-litesvm's named-account bundles / fixture helpers are
// meant to collapse into a few lines.
//
// Left as documented TODOs pending a build (to get exact instruction
// arg ordering from the IDL) and confirmation of litesvm-token's mint /
// ATA / mint_to builder API:
//
//   test_borrow_happy_path:
//     - init LendingPool (minimum_score <= worker's composite, e.g. 500)
//     - init VaultAccount + vault_token (funded with >= `amount` USDC)
//     - worker_token ATA for worker
//     - bootstrap worker's ScoreAccount to composite >= minimum_score
//       via flowscore::instruction::update_score_on_payment
//     - call flowlend::instruction::borrow, assert Ok, assert
//       loan_account.amount == amount, lending_pool.available_liquidity
//       decreased, vault_account.total_lent increased, worker_token
//       balance increased by `amount`
//
//   test_repay_amount_mismatch:
//     - same setup as above, plus an active LoanAccount from a prior
//       borrow with loan_account.amount == X
//     - call flowlend::instruction::repay with amount != X
//     - assert error == RepayAmountMismatch (error code 6003 per
//       errors.rs ordering: ScoreTooLow=0, LoanAlreadyActive=1,
//       InsufficientLiquidity=2, RepayAmountMismatch=3)
//
//   test_repay_happy_path_updates_flowscore_via_cpi:
//     - repay with amount == loan_account.amount
//     - assert loan_account is closed (close = worker)
//     - assert FlowScore's worker_score.payment_score increased by 15
//       (on_time repay) via the manual CPI in repay.rs — this is the
//       second cross-program CPI in the stack worth a structured-CPI-tree
//       assertion once anchor-litesvm is wired in.
