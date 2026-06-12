use anchor_lang::prelude::*;
use crate::state::BadgeAccount;
use crate::state::tier::BadgeTier;
use crate::errors::FlowBadgeError;
use flowscore::exports::ScoreAccount;
pub const FLOWSCORE_ID: Pubkey = anchor_lang::solana_program::system_program::ID; // replace on deploy

#[derive(Accounts)]
pub struct MintBadge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, 

    // Direct account read — NO CPI into FlowScore
    #[account(
        seeds = [b"score", authority.key().as_ref()],
        bump  = score_account.bump,
        seeds::program = FLOWSCORE_ID,
    )]
    pub score_account: Account<'info, ScoreAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + BadgeAccount::INIT_SPACE,
        seeds = [b"badge", authority.key().as_ref()],
        bump,
    )]
    pub badge_account: Account<'info, BadgeAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> MintBadge<'info> {
    pub fn process(&mut self, bumps: &MintBadgeBumps) -> Result<()> {
        require!(
            self.score_account.composite >= BadgeTier::Bronze.min_score(),
            FlowBadgeError::ScoreTooLow
        );
        // init already enforces "badge doesn't exist yet" via init

        let tier = BadgeTier::from_score(self.score_account.composite);
        let now  = Clock::get()?.unix_timestamp;

        let badge = &mut self.badge_account;
        badge.authority       = self.authority.key();
        badge.composite_score = self.score_account.composite;
        badge.total_contracts = 0;
        badge.total_earned    = 0;
        badge.member_since    = now;
        badge.tier           = tier as u8;
        badge.bump            = bumps.badge_account;

        msg!(
            "Badge minted for {}. Tier: {} | Composite: {} | Max borrow: {} USDC",
            self.authority.key(),
            tier.label(),
            self.score_account.composite,
            tier.max_borrow_usdc() / 1_000_000
        );
        Ok(())
    }
}