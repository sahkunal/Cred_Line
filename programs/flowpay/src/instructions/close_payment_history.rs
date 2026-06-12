use anchor_lang::prelude::*;
use crate::state::{ Flowpay, PayHistory };
use crate::errors::Error;

#[derive(Accounts)]
pub struct ClosePaymentHistory<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"flowpay", flowpay.payer.as_ref(), flowpay.payee.as_ref()],
        bump = flowpay.bump,
        constraint = flowpay.payer == authority.key() || flowpay.payee == authority.key() @Error::Unauthorized
    )]
    pub flowpay: Account<'info, Flowpay>,
    #[account(
        mut,
        close = authority,
        seeds = [
            b"payment_history",
            flowpay.key().as_ref(),
            &payment_history.payment_number.to_le_bytes()
        ],
        bump = payment_history.bump,
        constraint = payment_history.flowpay == flowpay.key() @Error::InvalidPaymentHistory
    )]
    pub payment_history: Account<'info, PayHistory>,
    pub system_program: Program<'info, System>,
}

impl<'info> ClosePaymentHistory<'info> {
    pub fn process(&mut self) -> Result<()> {
        // The account will be automatically closed and rent returned to authority
        // due to the "close = authority" 
        Ok(())
    }
}