use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{LoanAccount, VaultAccount, LendingPool};
use crate::errors::FlowLendError;
use flowscore::state::ScoreAccount;
use flowscore::ID as FLOWSCORE_ID;

/// 30 days in seconds
pub const LOAN_DURATION: i64 = 30 * 24 * 60 * 60;

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,
    #[account(
    seeds = [b"score", worker.key().as_ref()],
    bump  = worker_score.bump,
    seeds::program = FLOWSCORE_ID,
    constraint = worker_score.composite >= lending_pool.minimum_score
        @ FlowLendError::ScoreTooLow,
)]
pub worker_score: Account<'info, ScoreAccount>,

    /// LendingPool — holds minimum_score and available_liquidity
    #[account(
        mut,
        seeds = [b"lending_pool"],
        bump = lending_pool.bump,
    )]
    pub lending_pool: Account<'info, LendingPool>,

    /// VaultAccount — tracks total_deposited / total_lent
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault_account.bump,
    )]
    pub vault_account: Account<'info, VaultAccount>,

    #[account(
        mut,
        seeds = [b"vault_token"],
        bump,
        token::mint  = usdc_mint,
        token::authority = vault_account,
    )]
    pub vault_token: Account<'info, TokenAccount>,

    /// Worker's USDC token account — receives the loan
    #[account(
        mut,
        token::mint      = usdc_mint,
        token::authority = worker,
    )]
    pub worker_token: Account<'info, TokenAccount>,

    /// LoanAccount PDA — created fresh on every borrow
    /// Seeds: ["loan", worker] — one loan per worker at a time
    #[account(
        init,
        payer = worker,
        space = 8 + LoanAccount::INIT_SPACE,
        seeds = [b"loan", worker.key().as_ref()],
        bump,
    )]
    pub loan_account: Account<'info, LoanAccount>,

    /// CHECK: USDC mint — verified via token account constraints above
    pub usdc_mint: UncheckedAccount<'info>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> Borrow<'info> {
    pub fn process(&mut self, amount: u64, bumps: &BorrowBumps) -> Result<()> {

        require!(
            self.worker_score.composite >= self.lending_pool.minimum_score,
            FlowLendError::ScoreTooLow
        );

        // Pool liquidity check 
        // Use LendingPool.available_liquidity, not vault token balance
        require!(
            self.lending_pool.available_liquidity >= amount,
            FlowLendError::InsufficientLiquidity
        );

        //  Transfer USDC: vault → worker 
        let vault_seeds: &[&[u8]] = &[b"vault", &[self.vault_account.bump]];
        let signer_seeds = &[vault_seeds];

        token::transfer(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                Transfer {
                    from:      self.vault_token.to_account_info(),
                    to:        self.worker_token.to_account_info(),
                    authority: self.vault_account.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // Initialize LoanAccount 
        // Fields match loan.rs exactly: worker, amount, due_date, repaid, bump
        let now = Clock::get()?.unix_timestamp;
        let loan = &mut self.loan_account;
        loan.worker   = self.worker.key();
        loan.amount   = amount;
        loan.due_date = now.checked_add(LOAN_DURATION)
            .ok_or(FlowLendError::Overflow)?;
        loan.repaid   = false;
        loan.bump     = bumps.loan_account;

        //Update pool and vault tracking
        self.lending_pool.available_liquidity = self.lending_pool
            .available_liquidity
            .checked_sub(amount)
            .ok_or(FlowLendError::Overflow)?;

        self.vault_account.total_lent = self.vault_account
            .total_lent
            .checked_add(amount)
            .ok_or(FlowLendError::Overflow)?;

        msg!(
            "Loan of {} USDC issued to {}. Due: {}",
            amount, self.worker.key(), loan.due_date
        );
        Ok(())
    }
}
