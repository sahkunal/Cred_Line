use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultAccount {
    pub total_deposited: u64,
    pub total_lent:      u64,
    pub bump:            u8,
}