use anchor_lang::prelude::*;

declare_id("G32vZMq7bqxzTCtPqB8BRi2jZzTpJWHguPfpcjWwDiuV")

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::{
    mint_badge::;
    update_badge::;
}

#[program]
pub mod flowbadge{
    use super::*;

    pub fn mint_badge(ctx: Context<MintBadge>)-> Result<()>{
        ctx.accounts.process()
    }
    pub fn update_badge(ctx: Context<UpdateBadge>)-> Result<()>{
        ctx.accounts.process()
    }
}