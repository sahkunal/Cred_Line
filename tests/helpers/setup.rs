use anchor_lang::prelude::Pubkey;

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