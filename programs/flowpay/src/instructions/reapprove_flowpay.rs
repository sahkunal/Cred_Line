use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, Approve, approve};
use crate::state::Flowpay;

#[derive(Accounts)]
pub struct ReapproveFlowpay<'info> {
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
        has_one = token,
        seeds = [b"flowpay", payer.key().as_ref(), flowpay.payee.as_ref()],
        bump = flowpay.bump,
    )]
    pub flowpay: Account<'info, Flowpay>,
    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> ReapproveFlowpay<'info> {
    pub fn process(&mut self, new_delegation_amount: u64) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Approve {
            authority: self.payer.to_account_info(),
            delegate: self.flowpay.to_account_info(),
            to: self.payer_ata.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        approve(cpi_ctx, new_delegation_amount)
    }
}