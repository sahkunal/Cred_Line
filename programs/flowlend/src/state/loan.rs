use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct LoanAccount {
    pub worker: Pubkey,
    pub amount: u64,
    pub due_date: i64,
    pub repaid: bool,
    pub bump: u8,
}