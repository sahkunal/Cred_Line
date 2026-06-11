use anchor_lang::prelude::*;

declare_id!("zVkasAovzgieLuz3RYxk1bUqSevMN6QkHbBtrrweNKE");
pub mod instructions;
pub mod errors;
pub mod state;

use instructions::{
    update_score::*,
};

#[program]
pub mod flowscore{
    use super::*;
    pub fn update_score_on_payment(ctx: Context<UpdateScoreOnPayment>, amount: u64) -> Result<()> {
    ctx.accounts.process(amount, &ctx.bumps)
}

pub fn report_missed_payment(ctx: Context<ReportMissedPayment>, next_payout: i64) -> Result<()> {
    ctx.accounts.process(next_payout)
}

pub fn report_failed_payment(
    ctx: Context<ReportFailedPayment>,
    reason: FailureReason
) -> Result<()> {
    ctx.accounts.process(reason)
}
}