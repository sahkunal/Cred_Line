use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct LendingPool {
    pub authority: Pubkey,
    pub total_deposits: u64,
    pub available_liquidity: u64,
    pub minimum_score: u32,      // score required to borrow
    pub bump: u8,
}