use anchor_lang::prelude::*;

declare_id!("mZMoMVBVHwMDwHdGTKphP5sAY5raL8z4tx51qai6TVX");

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::{
    cancel_flowpay::*,
    close_payment_history::*,
    create_flowpay::*,
    execute_flowpay::*,
    reapprove_flowpay::*,
};

#[program]
pub mod flowpay {
    use super::*;

    pub fn create_flowpay(
        ctx: Context<CreateFlowpay>,
        amount: u64,
        frequency: i64,
    ) -> Result<()> {
        ctx.accounts.process(amount, frequency, &ctx.bumps)
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

    pub fn close_payment_history(ctx: Context<ClosePaymentHistory>) -> Result<()> {
        ctx.accounts.process()
    }
}