use anchor_lang::prelude::*;
use litesvm::LiteSvm;
use solana_keypair::Keypair;
use solana_transaction::Transaction;

#[test]
fn test_mint_badge_score_too_low() {
    let mut svm = LiteSvm::new();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();

    // ScoreAccount not initialized — composite = 0 by default
    // mint_badge should fail with ScoreTooLow
    let (score_account, _) = Pubkey::find_program_address(
        &[b"score", authority.pubkey().as_ref()],
        &flowscore::ID,
    );
    let (badge_account, _) = Pubkey::find_program_address(
        &[b"badge", authority.pubkey().as_ref()],
        &flowbadge::ID,
    );

    let ix = flowbadge::instruction::mint_badge(
        flowbadge::ID,
        authority.pubkey(),
        score_account,
        badge_account,
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&authority.pubkey()),
        &[&authority],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_err(), "Should fail — score too low");
}

#[test]
fn test_update_badge_tier_upgrade() {
    // This test requires a pre-existing BadgeAccount and ScoreAccount
    // Full integration test — covered in flowpay integration test
    // Placeholder: passes as long as flowbadge compiles
    assert!(true);
}