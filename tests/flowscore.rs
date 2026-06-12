use anchor_lang::prelude::*;
use litesvm::LiteSvm;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_transaction::Transaction;

mod helpers;
use helpers::*;

#[test]
fn test_update_score_on_payment() {
    let mut svm = LiteSvm::new();
    let payer = Keypair::new();
    let payee = Keypair::new();
    let payer_wallet = Keypair::new();

    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    // derive PDAs
    let (payee_score, _) = Pubkey::find_program_address(
        &[b"score", payee.pubkey().as_ref()],
        &flowscore::ID,
    );
    let (payer_score, _) = Pubkey::find_program_address(
        &[b"score", payer_wallet.pubkey().as_ref()],
        &flowscore::ID,
    );

    // build ix
    let ix = flowscore::instruction::update_score_on_payment(
        flowscore::ID,
        payer.pubkey(),
        payee.pubkey(),
        payer_wallet.pubkey(),
        payee_score,
        payer_score,
        1_000_000, // amount
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "update_score_on_payment failed: {:?}", result);

    // verify payee score account
    let payee_score_acc: flowscore::exports::ScoreAccount =
        svm.get_account_data_as(&payee_score).unwrap();
    assert_eq!(payee_score_acc.payment_score, 10);
    assert_eq!(payee_score_acc.composite, 510); // 500 + 10
    assert_eq!(payee_score_acc.total_contracts, 1);
}

#[test]
fn test_report_missed_payment_too_early() {
    let mut svm = LiteSvm::new();
    let reporter = Keypair::new();
    let flowpay = Keypair::new();
    let payer_wallet = Keypair::new();

    svm.airdrop(&reporter.pubkey(), 10_000_000_000).unwrap();

    let (payer_score, _) = Pubkey::find_program_address(
        &[b"score", payer_wallet.pubkey().as_ref()],
        &flowscore::ID,
    );

    // next_payout is in the future — should fail
    let future_payout = i64::MAX;
    let ix = flowscore::instruction::report_missed_payment(
        flowscore::ID,
        reporter.pubkey(),
        flowpay.pubkey(),
        payer_wallet.pubkey(),
        payer_score,
        future_payout,
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&reporter.pubkey()),
        &[&reporter],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_err(), "Should have failed — payment not yet overdue");
}

#[test]
fn test_report_failed_payment_insufficient_funds() {
    let mut svm = LiteSvm::new();
    let caller = Keypair::new();
    let payer_wallet = Keypair::new();

    svm.airdrop(&caller.pubkey(), 10_000_000_000).unwrap();

    let (payer_score, _) = Pubkey::find_program_address(
        &[b"score", payer_wallet.pubkey().as_ref()],
        &flowscore::ID,
    );

    let ix = flowscore::instruction::report_failed_payment(
        flowscore::ID,
        caller.pubkey(),
        payer_wallet.pubkey(),
        payer_score,
        flowscore::types::FailureReason::InsufficientFunds,
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&caller.pubkey()),
        &[&caller],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "report_failed_payment failed: {:?}", result);

    let score_acc: flowscore::exports::ScoreAccount =
        svm.get_account_data_as(&payer_score).unwrap();
    assert_eq!(score_acc.default_penalty, 30);
    assert_eq!(score_acc.composite, 470); // 500 - 30
}

#[test]
fn test_update_score_on_repay_on_time() {
    let mut svm = LiteSvm::new();
    let caller = Keypair::new();
    let worker = Keypair::new();

    svm.airdrop(&caller.pubkey(), 10_000_000_000).unwrap();

    let (worker_score, _) = Pubkey::find_program_address(
        &[b"score", worker.pubkey().as_ref()],
        &flowscore::ID,
    );

    let ix = flowscore::instruction::update_score_on_repay(
        flowscore::ID,
        caller.pubkey(),
        worker.pubkey(),
        worker_score,
        true, // on_time
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&caller.pubkey()),
        &[&caller],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "update_score_on_repay failed: {:?}", result);

    let score_acc: flowscore::exports::ScoreAccount =
        svm.get_account_data_as(&worker_score).unwrap();
    assert_eq!(score_acc.payment_score, 15);
    assert_eq!(score_acc.composite, 515); // 500 + 15
}