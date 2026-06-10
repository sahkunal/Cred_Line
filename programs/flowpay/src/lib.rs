use anchor_lang::prelude::*;

declare_id!("HU1Vqae6eUFNxu6kdWD2DoN9TksxevcAWxkSKXCVwnHk");

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::{
    cancel_flowpay::*,
    close_payment_history::*,
    create_flowpay::*,
    execute_flowpay::*,
    reapprove_flowpay::*,
    subscriptions_flowpay::*,
    users_flowpay::*,
};

#[program]
pub mod flowpay {
    use super::*;

    pub fn create_flowpay(
        ctx: Context<CreateFlowpay>,
        amount: u64,
        frequency: i64,
        name: String,
        description: String,
    ) -> Result<()> {
        ctx.accounts.process(amount, frequency, name, description, &ctx.bumps)
    }

    pub fn cancel_flowpay(ctx: Context<CancelFlowpay>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn execute_flowpay(ctx: Context<ExecuteFlowpay>) -> Result<()> {
        ctx.accounts.execute_flowpay(&ctx.bumps)
    }


    pub fn reapprove_flowpay(ctx: Context<ReapproveFlowpay>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount)
    }
}