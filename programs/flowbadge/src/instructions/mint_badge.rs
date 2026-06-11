use anchor_lang::prelude::*;
use crate::state::{BadgeAccount, WorkerScoreAccount};
use crate::errors::FlowBadgeError;


pub const TIER_BRONZE:   u32 = 400;
pub const TIER_SILVER:   u32 = 600;
pub const TIER_GOLD:     u32 = 800;
pub const TIER_PLATINUM: u32 = 900;

pub const FLOWPAY_PROGRAM_ID: Pubkey = anchor_lang::solana_program::system_program::ID;

/// Derives the tier u8 from a composite score
pub fn score_to_tier(composite: u32) -> u8 {
    match composite {
        s if s >= TIER_PLATINUM => 3, // Platinum
        s if s >= TIER_GOLD     => 2, // Gold
        s if s >= TIER_SILVER   => 1, // Silver
        _                        => 0, // Bronze
    }
}

#[derive(Accounts)]
pub struct MintBadge<'info> {
    #[account(
        mut,
        constraint = caller.key() == FLOWPAY_PROGRAM_ID
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
        init,
        payer = caller,
        space = 8 + BadgeAccount::INIT_SPACE,
        seeds = [b"badge", worker.key().as_ref()],
        bump,
    )]
    pub badge_account: Account<'info, BadgeAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> MintBadge<'info> {
    pub fn process(&mut self, bumps: &MintBadgeBumps) -> Result<()> {
        require!(
            self.worker_score.composite >= TIER_BRONZE,
            FlowBadgeError::ScoreTooLow
        );

        // ── 2. Derive starting tier from current score 
        let tier = score_to_tier(self.worker_score.composite);

        
        let now = Clock::get()?.unix_timestamp;
        let badge = &mut self.badge_account;
        badge.authority       = self.worker.key();
        badge.composite_score = self.worker_score.composite;
        badge.total_contracts = 0;
        badge.total_earned    = 0;
        badge.member_since    = now;
        badge.tier            = tier;
        badge.bump            = bumps.badge_account;

        msg!(
            "Badge minted for {}. Tier: {} Composite: {}",
            self.worker.key(), tier, self.worker_score.composite
        );
        Ok(())
    }
}
