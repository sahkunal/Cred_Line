use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{LoanAccount, VaultAccount, LendingPool};
use crate::errors::FlowLendError;
use anchor_lang::solana_program::system_program;


pub const FLOW_SCORE_PROGRAM_ID: Pubkey = system_program::ID;

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,

    /// LoanAccount — must belong to worker, must not be repaid yet
    /// close = worker returns rent to worker on account close
    #[account(
        mut,
        seeds  = [b"loan", worker.key().as_ref()],
        bump   = loan_account.bump,
        constraint = loan_account.worker == worker.key()
            @ FlowLendError::AlreadyRepaid,
        constraint = !loan_account.repaid
            @ FlowLendError::AlreadyRepaid,
        close  = worker,
    )]
    pub loan_account: Account<'info, LoanAccount>,

    /// LendingPool — available_liquidity restored after repay
    #[account(
        mut,
        seeds = [b"lending_pool"],
        bump  = lending_pool.bump,
    )]
    pub lending_pool: Account<'info, LendingPool>,

    /// VaultAccount — total_lent decremented after repay
    #[account(
        mut,
        seeds = [b"vault"],
        bump  = vault_account.bump,
    )]
    pub vault_account: Account<'info, VaultAccount>,

    /// Vault USDC token account — receives repayment
    #[account(
        mut,
        seeds = [b"vault_token"],
        bump,
        token::mint      = usdc_mint,
        token::authority = vault_account,
    )]
    pub vault_token: Account<'info, TokenAccount>,

    /// Worker USDC token account — sends repayment
    #[account(
        mut,
        token::mint      = usdc_mint,
        token::authority = worker,
    )]
    pub worker_token: Account<'info, TokenAccount>,

    /// WorkerScoreAccount — passed to FlowScore CPI
    /// CHECK: FlowScore program validates this account
    #[account(mut)]
    pub worker_score: UncheckedAccount<'info>,

    /// FlowScore program — receives CPI call after repayment
    /// CHECK: constrained to known FLOW_SCORE_PROGRAM_ID
    #[account(
        constraint = flow_score_program.key() == FLOW_SCORE_PROGRAM_ID
            @ FlowLendError::ScoreTooLow,
    )]
    pub flow_score_program: UncheckedAccount<'info>,

    /// CHECK: USDC mint
    pub usdc_mint: UncheckedAccount<'info>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> Repay<'info> {
    pub fn process(&mut self, amount: u64) -> Result<()> {

        // ── 1. Amount must match exactly ─────────────────────
        require!(
            amount == self.loan_account.amount,
            FlowLendError::RepayAmountMismatch
        );

        // ── 2. Transfer USDC: worker → vault ─────────────────
        token::transfer(
            CpiContext::new(
                self.token_program.to_account_info(),
                Transfer {
                    from:      self.worker_token.to_account_info(),
                    to:        self.vault_token.to_account_info(),
                    authority: self.worker.to_account_info(),
                },
            ),
            amount,
        )?;

        // ── 3. Restore pool liquidity and vault tracking ──────
        self.lending_pool.available_liquidity = self.lending_pool
            .available_liquidity
            .checked_add(amount)
            .ok_or(FlowLendError::Overflow)?;

        self.vault_account.total_lent = self.vault_account
            .total_lent
            .saturating_sub(amount);

       // ── 4. Determine if repaid on time ───────────────────
let now = Clock::get()?.unix_timestamp;
let on_time = now <= self.loan_account.due_date;

// ── 5. Mark repaid before account closes ─────────────
self.loan_account.repaid = true;

// ── 6. CPI → FlowScore: update_score_on_repay ────────
// precomputed: sha256("global:update_score_on_repay")[..8]
let data_prefix: [u8; 8] = [0xfc, 0x30, 0x79, 0xca, 0x98, 0x74, 0x22, 0x9d];
let mut data: Vec<u8> = data_prefix.to_vec();
data.extend_from_slice(&[on_time as u8]);

let ix = anchor_lang::solana_program::instruction::Instruction {
    program_id: self.flow_score_program.key(),
    accounts: vec![
        anchor_lang::solana_program::instruction::AccountMeta::new(
            self.vault_account.key(), true
        ),
        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
            self.worker.key(), false
        ),
        anchor_lang::solana_program::instruction::AccountMeta::new(
            self.worker_score.key(), false
        ),
    ],
    data,
};

let vault_seeds: &[&[u8]] = &[b"vault", &[self.vault_account.bump]];
anchor_lang::solana_program::program::invoke_signed(
    &ix,
    &[
        self.vault_account.to_account_info(),
        self.worker.to_account_info(),
        self.worker_score.to_account_info(),
        self.flow_score_program.to_account_info(),
    ],
    &[vault_seeds],
)?;

msg!(
    "Loan of {} USDC repaid by {}. On time: {}",
    amount, self.worker.key(), on_time
);

Ok(())
    }
}
