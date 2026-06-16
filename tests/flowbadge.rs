use litesvm::LiteSvm;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;

#[path = "helpers/mod.rs"]
mod helpers;
use helpers::*;

fn setup() -> LiteSvm {
    let mut svm = LiteSvm::new();
    load_program(&mut svm, &flowbadge::ID, "flowbadge");
    load_program(&mut svm, &flowscore::ID, "flowscore");
    svm
}

#[test]
fn test_mint_badge_score_too_low() {
    let mut svm = setup();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();

    let score_account = score_pda(&authority.pubkey(), &flowscore::ID);
    let badge_account = badge_pda(&authority.pubkey(), &flowbadge::ID);

    let ix = flowbadge::instruction::mint_badge(
        flowbadge::ID,
        authority.pubkey(),
        score_account,
        badge_account,
        solana_sdk_ids::system_program::ID,
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&authority.pubkey()),
        &[&authority],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_err(), "mint_badge should fail — score_account does not exist");
}

#[test]
fn test_mint_badge_happy_path_bronze() {
    let mut svm = setup();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    let payer_wallet = Keypair::new();
    let score_account = score_pda(&authority.pubkey(), &flowscore::ID);
    let payer_score = score_pda(&payer_wallet.pubkey(), &flowscore::ID);

    let bootstrap_ix = flowscore::instruction::update_score_on_payment(
        flowscore::ID,
        authority.pubkey(), 
        authority.pubkey(), 
        payer_wallet.pubkey(),
        score_account,
        payer_score,
        1_000_000,
    );
    let bootstrap_tx = Transaction::new_signed_with_payer(
        &[bootstrap_ix],
        Some(&authority.pubkey()),
        &[&authority],
        svm.latest_blockhash(),
    );
    svm.send_transaction(bootstrap_tx).unwrap();

    let score_acc: flowscore::exports::ScoreAccount =
        svm.get_account_data_as(&score_account).unwrap();
    assert_eq!(score_acc.composite, 510);

    let badge_account = badge_pda(&authority.pubkey(), &flowbadge::ID);
    let mint_ix = flowbadge::instruction::mint_badge(
        flowbadge::ID,
        authority.pubkey(),
        score_account,
        badge_account,
        solana_sdk_ids::system_program::ID,
    );
    let mint_tx = Transaction::new_signed_with_payer(
        &[mint_ix],
        Some(&authority.pubkey()),
        &[&authority],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(mint_tx);
    assert!(result.is_ok(), "mint_badge failed: {:?}", result);

    let badge: flowbadge::accounts::BadgeAccount =
        svm.get_account_data_as(&badge_account).unwrap();
    assert_eq!(badge.authority, authority.pubkey());
    assert_eq!(badge.composite_score, 510);
    assert_eq!(badge.tier, 0); // Bronze (400..600)
}

#[test]
fn test_update_badge_tier_upgrade() {
    let mut svm = setup();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();

    let score_account = score_pda(&authority.pubkey(), &flowscore::ID);
    let badge_account = badge_pda(&authority.pubkey(), &flowbadge::ID);

    // Bootstrap score to 510 and mint a Bronze badge (same as above).
    let payer_wallet = Keypair::new();
    let payer_score = score_pda(&payer_wallet.pubkey(), &flowscore::ID);
    let bootstrap_ix = flowscore::instruction::update_score_on_payment(
        flowscore::ID,
        authority.pubkey(),
        authority.pubkey(),
        payer_wallet.pubkey(),
        score_account,
        payer_score,
        1_000_000,
    );
    let bootstrap_tx = Transaction::new_signed_with_payer(
        &[bootstrap_ix],
        Some(&authority.pubkey()),
        &[&authority],
        svm.latest_blockhash(),
    );
    svm.send_transaction(bootstrap_tx).unwrap();

    let mint_ix = flowbadge::instruction::mint_badge(
        flowbadge::ID,
        authority.pubkey(),
        score_account,
        badge_account,
        solana_sdk_ids::system_program::ID,
    );
    let mint_tx = Transaction::new_signed_with_payer(
        &[mint_ix],
        Some(&authority.pubkey()),
        &[&authority],
        svm.latest_blockhash(),
    );
    svm.send_transaction(mint_tx).unwrap();


    for _ in 0..9 {
        let ix = flowscore::instruction::update_score_on_payment(
            flowscore::ID,
            authority.pubkey(),
            authority.pubkey(),
            payer_wallet.pubkey(),
            score_account,
            payer_score,
            1_000_000,
        );
        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&authority.pubkey()),
            &[&authority],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();
    }

    let score_acc: flowscore::exports::ScoreAccount =
        svm.get_account_data_as(&score_account).unwrap();
    assert_eq!(score_acc.composite, 600); // Silver threshold reached

    let update_ix = flowbadge::instruction::update_badge(
        flowbadge::ID,
        authority.pubkey(),
        score_account,
        badge_account,
        solana_sdk_ids::system_program::ID,
    );
    let update_tx = Transaction::new_signed_with_payer(
        &[update_ix],
        Some(&authority.pubkey()),
        &[&authority],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(update_tx);
    assert!(result.is_ok(), "update_badge failed: {:?}", result);

    let badge: flowbadge::accounts::BadgeAccount =
        svm.get_account_data_as(&badge_account).unwrap();
    assert_eq!(badge.composite_score, 600);
    assert_eq!(badge.tier, 1); // Silver (600..800)
}
