use std::ops::Mul;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, Approve, approve};
use crate::state::{Flowpay, User, FLOWPAY_SIZE};

#[derive(Accounts)]
pub struct CreateFlowpay<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub payee: SystemAccount<'info>,
    pub token: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = token,
        associated_token::authority = payer,
    )]
    pub payer_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        seeds = [b"flowpay", payer.key().as_ref(), payee.key().as_ref()],
        bump,
        space = FLOWPAY_SIZE
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
        seeds = [b"user", payee.key().as_ref()],
        bump,
    )]
    pub payee_user: Account<'info, User>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateFlowpay<'info> {
    pub fn init_flowpay(
        &mut self,
        amount: u64,
        frequency: i64,
        name: String,
        description: String,
        bumps: &CreateFlowpayBumps,
    ) -> Result<()> {
        self.flowpay.set_inner(Flowpay {
            payer: self.payer.key(),
            payee: self.payee.key(),
            amount,
            token: self.token.key(),
            frequency,
            active: true,
            next_payout: Clock::get()?.unix_timestamp.wrapping_add(frequency),
            bump: bumps.flowpay,
            name,
            description,
            payment_count: 0,
        });
        Ok(())
    }

    pub fn approve_delegate_authority(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Approve {
            authority: self.payer.to_account_info(),
            delegate: self.flowpay.to_account_info(),
            to: self.payer_ata.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        approve(cpi_ctx, self.flowpay.amount.mul(3))
    }

    pub fn update_subscription_counts(&mut self) -> Result<()> {
        self.payer_user.outgoing_subscriptions_count += 1;
        self.payee_user.incoming_subscriptions_count += 1;
        Ok(())
    }

    pub fn process(
        &mut self,
        amount: u64,
        frequency: i64,
        name: String,
        description: String,
        bumps: &CreateFlowpayBumps,
    ) -> Result<()> {
        self.init_flowpay(amount, frequency, name, description, bumps)?;
        self.approve_delegate_authority()?;
        self.update_subscription_counts()?;
        Ok(())
    }
}