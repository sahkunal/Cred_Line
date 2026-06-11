use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct WorkerScoreAccount {
    pub authority:      Pubkey,
    pub payment_score:  u32,
    pub missed_penalty: u32,
    pub loan_bonus:     u32,
    pub loan_penalty:   u32,
    pub composite:      u32,
    pub last_updated:   i64,
    pub bump:           u8,
}