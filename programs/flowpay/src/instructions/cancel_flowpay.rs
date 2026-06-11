use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, Revoke, revoke};
use crate::state::Flowpay;

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

    pub fn process(&mut self) -> Result<()> {
        self.revoke_delegate_authority()?;
        Ok(())
    }
}