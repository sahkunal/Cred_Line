
use anchor_lang::prelude::*;

declare_id!("5pLCnuGivTRnFW71V7TD8p4Hvssq45k8muBnDzrodt43");

pub mod instructions;
pub mod state;
pub mod errors;
pub mod types;

use instructions::{
    borrow::*,
    repay::*,
};

#[program]
pub mod flowlend {
    use super::*;

    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount, &ctx.bumps)
    }
    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount)
    }
}
