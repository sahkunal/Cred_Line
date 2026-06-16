use anchor_lang::prelude::*;

declare_id!("J4AF7z9dq3GJoZqHDQnVfA1gWqok4uVGgLEZfXnQ3fZ3");

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