use anchor_lang::prelude::*;

declare_id!("GimhF4JiKJfvr2ydNkqcm57zUjGaFy1FSuki1RdLAuL4");

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::{
    mint_badge::*,
    update_badge::*,
};

#[program]
pub mod flowbadge{
    use super::*;

  pub fn mint_badge(ctx: Context<MintBadge>) -> Result<()> {
    ctx.accounts.process(&ctx.bumps)
}

pub fn update_badge(ctx: Context<UpdateBadge>) -> Result<()> {
    ctx.accounts.process()
}

}