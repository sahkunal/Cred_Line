use anchor_lang::prelude::*;

declare_id!("EpnRYokwwxagwRqRASoK7ndKJBerhzHZnx6uxy7aGUS8");

pub mod instructions;
pub mod errors;
pub mod state;

use instructions::update_score::*;

#[program]
pub mod flowscore {
    use super::*;

    pub fn update_score_on_payment(ctx: Context<UpdateScoreOnPayment>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount, &ctx.bumps)
    }

    pub fn report_missed_payment(ctx: Context<ReportMissedPayment>, next_payout: i64) -> Result<()> {
        ctx.accounts.process(next_payout)
    }

    pub fn report_failed_payment(ctx: Context<ReportFailedPayment>, reason: FailureReason) -> Result<()> {
        ctx.accounts.process(reason)
    }

    pub fn update_score_on_repay(ctx: Context<UpdateScoreOnRepay>, on_time: bool) -> Result<()> {
        ctx.accounts.process(on_time)
    }
}

#[cfg(feature = "exports")]
pub mod exports {
    pub use crate::state::ScoreAccount;
}