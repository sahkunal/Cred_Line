use litesvm::LiteSvm;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;
use spl_associated_token_account::get_associated_token_address;

#[path = "helpers/mod.rs"]
mod helpers;
use helpers::*;

/// Spin up a fresh LiteSVM with FlowPay + FlowScore loaded.
///
/// FlowPay's `execute_flowpay` performs a same-transaction CPI into
/// FlowScore's `update_score_on_payment`, so both programs must be
/// present for any execute_flowpay test to reach that code path.
fn setup() -> LiteSvm {
    let mut svm = LiteSvm::new();
    load_program(&mut svm, &flowpay::ID, "flowpay");
    load_program(&mut svm, &flowscore::ID, "flowscore");
    svm
}

/// Creates a mint + funds a payer ATA with `amount` tokens.
///
/// Returns (mint, payer_ata).
fn setup_mint_and_payer_ata(svm: &mut LiteSvm, payer: &Keypair, amount: u64) -> (solana_pubkey::Pubkey, solana_pubkey::Pubkey) {
    use litesvm_token::{CreateMint, MintTo, CreateAssociatedTokenAccount};

    let mint_authority = Keypair::new();
    svm.airdrop(&mint_authority.pubkey(), 10_000_000_000).unwrap();

    let mint = CreateMint::new(svm, &mint_authority)
        .decimals(6)
        .send()
        .unwrap();

    let payer_ata = CreateAssociatedTokenAccount::new(svm, payer, &mint)
        .owner(&payer.pubkey())
        .send()
        .unwrap();

    MintTo::new(svm, &mint_authority, &mint, &payer_ata, amount)
        .send()
        .unwrap();

    (mint, payer_ata)
}

#[test]
fn test_create_flowpay_sets_mandate_and_delegate() {
    let mut svm = setup();
    let payer = Keypair::new();
    let payee = Keypair::new();

    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&payee.pubkey(), 10_000_000_000).unwrap();

    let amount: u64 = 1_000_000; // 1.0 token @ 6 decimals
    let frequency: i64 = 86_400; // daily

    let (mint, payer_ata) = setup_mint_and_payer_ata(&mut svm, &payer, amount * 10);

    let flowpay_pda = flowpay_pda(&payer.pubkey(), &payee.pubkey(), &flowpay::ID);

    let ix = flowpay::instruction::create_flowpay(
        flowpay::ID,
        payer.pubkey(),
        payee.pubkey(),
        mint,
        payer_ata,
        flowpay_pda,
        spl_token::ID,
        solana_sdk_ids::system_program::ID,
        amount,
        frequency,
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "create_flowpay failed: {:?}", result);

    let mandate: flowpay::accounts::Flowpay = svm.get_account_data_as(&flowpay_pda).unwrap();
    assert_eq!(mandate.payer, payer.pubkey());
    assert_eq!(mandate.payee, payee.pubkey());
    assert_eq!(mandate.amount, amount);
    assert_eq!(mandate.frequency, frequency);
    assert!(mandate.active);
    assert_eq!(mandate.payment_count, 0);

    // Delegate approval: payer_ata's delegate should now be the flowpay
    // PDA, with delegated_amount == amount * 3 (see approve_delegate_authority)
    let ata_account: spl_token::state::Account = {
        let raw = svm.get_account(&payer_ata).unwrap();
        spl_token::state::Account::unpack(&raw.data).unwrap()
    };
    assert_eq!(ata_account.delegate, spl_program_option::COption::Some(flowpay_pda));
    assert_eq!(ata_account.delegated_amount, amount * 3);
}

#[test]
fn test_execute_flowpay_too_early_fails() {
    let mut svm = setup();
    let payer = Keypair::new();
    let payee = Keypair::new();

    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&payee.pubkey(), 10_000_000_000).unwrap();

    let amount: u64 = 1_000_000;
    let frequency: i64 = 86_400;

    let (mint, payer_ata) = setup_mint_and_payer_ata(&mut svm, &payer, amount * 10);
    let flowpay_pda = flowpay_pda(&payer.pubkey(), &payee.pubkey(), &flowpay::ID);

    // create the mandate first — next_payout = now + frequency, so an
    // immediate execute_flowpay should hit PaymentTooEarly
    let create_ix = flowpay::instruction::create_flowpay(
        flowpay::ID,
        payer.pubkey(),
        payee.pubkey(),
        mint,
        payer_ata,
        flowpay_pda,
        spl_token::ID,
        solana_sdk_ids::system_program::ID,
        amount,
        frequency,
    );
    let create_tx = Transaction::new_signed_with_payer(
        &[create_ix],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(create_tx).unwrap();

    // attempt execute_flowpay immediately — should fail PaymentTooEarly
    let payee_ata = get_associated_token_address(&payee.pubkey(), &mint);
    let payment_history_pda = pay_history_pda(&flowpay_pda, 0, &flowpay::ID);
    let payee_score = score_pda(&payee.pubkey(), &flowscore::ID);
    let payer_score = score_pda(&payer.pubkey(), &flowscore::ID);

    let execute_ix = flowpay::instruction::execute_flowpay(
        flowpay::ID,
        payer.pubkey(),  // signer (anyone can trigger execution)
        payer.pubkey(),
        payer_ata,
        payee.pubkey(),
        flowpay_pda,
        payment_history_pda,
        mint,
        payee_ata,
        spl_associated_token_account::ID,
        spl_token::ID,
        solana_sdk_ids::system_program::ID,
        flowscore::ID,
        payee_score,
        payer_score,
    );

    let execute_tx = Transaction::new_signed_with_payer(
        &[execute_ix],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(execute_tx);
    assert!(result.is_err(), "execute_flowpay should fail before next_payout (PaymentTooEarly)");
}

// NOTE: a full `execute_flowpay` happy-path test (warping the clock past
// next_payout, then asserting the FlowScore CPI updates both payee_score
// and payer_score ScoreAccounts) is the highest-value cross-program test
// in this suite — it directly exercises the FlowPay -> FlowScore CPI from
// the capstone blocker list. It's omitted here pending confirmation of:
//   1. `flowpay::instruction::execute_flowpay` argument order (generated
//      from the #[derive(Accounts)] struct field order in
//      execute_flowpay.rs — verify against the built IDL).
//   2. LiteSVM clock warping API (`svm.warp_to_slot` / `set_sysvar` for
//      Clock) to advance past `next_payout`.
// Once `cargo build-sbf` succeeds, `cargo expand` or the generated IDL
// (`target/idl/flowpay.json`) will give the exact instruction signature
// to fill this in.
