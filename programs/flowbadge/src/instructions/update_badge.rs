use anchor_lang::prelude::*;
use crate::state::{BadgeAccount, WorkerScoreAccount};
use crate::errors::FlowBadgeError;
use crate::instructions::mint_badge::score_to_tier;

pub const FLOWSCORE_PROGRAM_ID: Pubkey = anchor_lang::solana_program::system_program::ID;

#[derive(Accounts)]
pub struct UpdateBadge<'info> {
   
    #[account(
        constraint = caller.key() == FLOWSCORE_PROGRAM_ID
            @ FlowBadgeError::UnauthorizedCaller
    )]
    pub caller: Signer<'info>,

    pub worker: UncheckedAccount<'info>,


    #[account(
        seeds = [b"worker_score", worker.key().as_ref()],
        bump  = worker_score.bump,
        constraint = worker_score.authority == worker.key()
            @ FlowBadgeError::ScoreAccountMismatch,
    )]
    pub worker_score: Account<'info, WorkerScoreAccount>,


    #[account(
        mut,
        seeds = [b"badge", worker.key().as_ref()],
        bump  = badge_account.bump,
        constraint = badge_account.authority == worker.key()
            @ FlowBadgeError::ScoreAccountMismatch,
    )]
    pub badge_account: Account<'info, BadgeAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> UpdateBadge<'info> {
    pub fn process(&mut self) -> Result<()> {
        let new_composite = self.worker_score.composite;
        let new_tier      = score_to_tier(new_composite);
        let old_tier      = self.badge_account.tier;

        self.badge_account.composite_score = new_composite;


        if new_tier > old_tier {
            self.badge_account.tier = new_tier;
            msg!(
                "Badge upgraded for {}. Tier: {} → {} Composite: {}",
                self.worker.key(), old_tier, new_tier, new_composite
            );
        } else {
            msg!(
                "Badge score synced for {}. Tier unchanged: {} Composite: {}",
                self.worker.key(), old_tier, new_composite
            );
        }

        Ok(())
    }
}
