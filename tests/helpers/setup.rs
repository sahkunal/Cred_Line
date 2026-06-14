use anchor_lang::prelude::Pubkey;
use litesvm::LiteSvm;

pub fn score_pda(wallet: &Pubkey, program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"score", wallet.as_ref()],
        program_id,
    ).0
}

pub fn badge_pda(wallet: &Pubkey, program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"badge", wallet.as_ref()],
        program_id,
    ).0
}

pub fn loan_pda(wallet: &Pubkey, program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"loan", wallet.as_ref()],
        program_id,
    ).0
}

/// FlowPay mandate PDA: seeds = ["flowpay", payer, payee]
pub fn flowpay_pda(payer: &Pubkey, payee: &Pubkey, program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"flowpay", payer.as_ref(), payee.as_ref()],
        program_id,
    ).0
}

/// PayHistory PDA: seeds = ["payment_history", flowpay, payment_count_le_bytes]
pub fn pay_history_pda(flowpay: &Pubkey, payment_count: u32, program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"payment_history", flowpay.as_ref(), &payment_count.to_le_bytes()],
        program_id,
    ).0
}

/// LendingPool PDA: seeds = ["lending_pool"]
pub fn lending_pool_pda(program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"lending_pool"], program_id).0
}

/// FlowLend vault PDA: seeds = ["vault"]
pub fn vault_pda(program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"vault"], program_id).0
}

/// FlowLend vault token account PDA: seeds = ["vault_token"]
pub fn vault_token_pda(program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"vault_token"], program_id).0
}

/// Load a compiled Anchor program (.so) into a fresh LiteSVM instance.
///
/// Requires `cargo build-sbf` (or `anchor build`) to have produced
/// `target/deploy/<name>.so` for the program being loaded.
///
/// Paths are resolved relative to the `tests/` crate's CARGO_MANIFEST_DIR,
/// so `../target/deploy/<name>.so` matches the workspace `target/` dir
/// at the repo root.
pub fn load_program(svm: &mut LiteSvm, program_id: &Pubkey, so_name: &str) {
    let path = format!(
        "{}/../target/deploy/{so_name}.so",
        env!("CARGO_MANIFEST_DIR")
    );
    let bytes = std::fs::read(&path)
        .unwrap_or_else(|e| panic!("failed to read {path}: {e} — did you run `cargo build-sbf`?"));
    svm.add_program(*program_id, &bytes);
}