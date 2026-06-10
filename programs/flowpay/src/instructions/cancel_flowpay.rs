use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, Revoke, revoke};
use crate::state::{Flowpay, User};

#[derive(Accounts)]
pub struct CancelFlowpay<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = token,
        associated_token::authority = payer,
    )]
    pub payer_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        has_one = payer,
        seeds = [b"flowpay", payer.key().as_ref(), flowpay.payee.as_ref()],
        bump = flowpay.bump,
        close = payer,
    )]
    pub flowpay: Account<'info, Flowpay>,
    #[account(
        mut,
        seeds = [b"user", payer.key().as_ref()],
        bump,
    )]
    pub payer_user: Account<'info, User>,
    #[account(
        mut,
        seeds = [b"user", flowpay.payee.as_ref()],
        bump,
    )]
    pub payee_user: Account<'info, User>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> CancelFlowpay<'info> {
    pub fn revoke_delegate_authority(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Revoke {
            authority: self.payer.to_account_info(),
            source: self.payer_ata.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        revoke(cpi_ctx)
    }

    pub fn update_subscription_counts(&mut self) -> Result<()> {
        if self.payer_user.outgoing_subscriptions_count > 0 {
            self.payer_user.outgoing_subscriptions_count -= 1;
        }
        if self.payee_user.incoming_subscriptions_count > 0 {
            self.payee_user.incoming_subscriptions_count -= 1;
        }
        Ok(())
    }

    pub fn process(&mut self) -> Result<()> {
        self.revoke_delegate_authority()?;
        self.update_subscription_counts()?;
        Ok(())
    }
}