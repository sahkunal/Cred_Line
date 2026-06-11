use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked},
};
use crate::state::{Flowpay, PayHistory};

#[derive(Accounts)]
pub struct ExecuteFlowpay<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: SystemAccount<'info>,
    #[account(
        mut,
        associated_token::mint = token,
        associated_token::authority = payer,
    )]
    pub payer_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub payee: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [b"flowpay", flowpay.payer.as_ref(), flowpay.payee.as_ref()],
        bump = flowpay.bump,
    )]
    pub flowpay: Account<'info, Flowpay>,
    #[account(
        init,
        payer = signer,
        space = 8 + PayHistory::INIT_SPACE,
        seeds = [b"payment_history", flowpay.key().as_ref(), &flowpay.payment_count.to_le_bytes()],
        bump
    )]
    pub payment_history: Account<'info, PayHistory>,
    pub token: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = token,
        associated_token::authority = payee
    )]
    pub payee_ata: InterfaceAccount<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> ExecuteFlowpay<'info> {
    pub fn execute_flowpay(&mut self, bumps: &ExecuteFlowpayBumps) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(now >= self.flowpay.next_payout, crate::errors::Error::PaymentTooEarly);

        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.payer_ata.to_account_info(),
            to: self.payee_ata.to_account_info(),
            authority: self.flowpay.to_account_info(),
            mint: self.token.to_account_info(),
        };
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"flowpay",
            self.flowpay.payer.as_ref(),
            self.flowpay.payee.as_ref(),
            &[self.flowpay.bump],
        ]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        transfer_checked(cpi_ctx, self.flowpay.amount, self.token.decimals)?;

        self.payment_history.set_inner(PayHistory {
             payer: self.payer.key(),
            payee: self.payee.key(),
            flowpay: self.flowpay.key(),
            amount: self.flowpay.amount,
            timestamp: now,
            payment_number: self.flowpay.payment_count,
            bump: bumps.payment_history,
        });

        self.flowpay.next_payout = now.wrapping_add(self.flowpay.frequency);
        self.flowpay.payment_count += 1;

        Ok(())
    }
}