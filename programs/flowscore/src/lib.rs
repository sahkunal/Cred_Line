use anchor_lang::prelude::*;

declare_id("zVkasAovzgieLuz3RYxk1bUqSevMN6QkHbBtrrweNKE");
pub mod instructions;
pub mod error;
pub mod state;

use instructions::{
    update_score::*;
};

#[program]
pub mod flowscore{
    use super::*;
    pub fn update_score(ctx: Context<UpdateScore>)-> Result<()>{
        ctx.accounts.process()
    }
}