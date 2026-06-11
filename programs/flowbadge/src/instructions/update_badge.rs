use anchor_lang::prelude::*;
use crate::state::BadgeAccount;
use crate::errors::FlowBadgeError;
use crate::state::tier::BadgeTier;
use flowscore::cpi_exports::ScoreAccount;
use flowscore::ID as FLOWSCORE_ID;

pub const FLOWSCORE_PROGRAM_ID: Pubkey = anchor_lang::solana_program::system_program::ID;

#[derive(Accounts)]
pub struct UpdateBadge<'info> {
    pub authority: Signer<'info>,  // worker or keeper, anyone

    // Direct account read — NO CPI
    #[account(
        seeds = [b"score", authority.key().as_ref()],
        bump  = score_account.bump,
        seeds::program = FLOWSCORE_ID,
    )]
    pub score_account: Account<'info, ScoreAccount>,

    #[account(
        mut,
        seeds = [b"badge", authority.key().as_ref()],
        bump  = badge_account.bump,
        constraint = badge_account.authority == authority.key()
            @ FlowBadgeError::ScoreAccountMismatch,
    )]
    pub badge_account: Account<'info, BadgeAccount>,

    pub system_program: Program<'info, System>,
}
impl<'info> UpdateBadge<'info> {
   pub fn process(&mut self) -> Result<()> {
    let new_composite = self.score_account.composite;
    //let new_tier = BadgeTier::from_score(new_composite);
    //let old_tier = self.badge_account.tier;
    let new_tier = BadgeTier::from_score(new_composite) as u8;
    let old_tier = self.badge_account.tier;
    
    self.badge_account.composite_score = new_composite;

    if new_tier > old_tier {
        self.badge_account.tier = new_tier;
        msg!(
            "Badge upgraded for {}. Tier: {:?} → {:?} Composite: {}",
            self.authority.key(), old_tier, new_tier, new_composite
        );
    } else {
        msg!(
            "Badge score synced for {}. Tier unchanged: {:?} Composite: {}",
            self.authority.key(), old_tier, new_composite
        );
    }
    Ok(())
}
}
