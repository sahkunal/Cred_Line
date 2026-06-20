// programs/flowlend/src/instructions/initialize_pool.rs
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenInterface, TokenAccount, Mint};
use crate::state::{LendingPool, VaultAccount};

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + LendingPool::INIT_SPACE,
        seeds = [b"lending_pool"],
        bump,
    )]
    pub lending_pool: Account<'info, LendingPool>,

    #[account(
        init,
        payer = authority,
        space = 8 + VaultAccount::INIT_SPACE,
        seeds = [b"vault"],
        bump,
    )]
    pub vault_account: Account<'info, VaultAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"vault_token"],
        bump,
        token::mint = usdc_mint,
        token::authority = vault_account,
        token::token_program = token_program,
    )]
    pub vault_token: InterfaceAccount<'info, TokenAccount>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializePool<'info> {
   pub fn process(&mut self, minimum_score: u32, initial_liquidity: u64, bumps: &InitializePoolBumps) -> Result<()> {
    self.lending_pool.set_inner(LendingPool {
        authority: self.authority.key(),
        total_deposits: initial_liquidity,
        available_liquidity: initial_liquidity,
        minimum_score,
        bump: bumps.lending_pool,
    });
    self.vault_account.set_inner(VaultAccount {
        total_deposited: initial_liquidity,
        total_lent: 0,
        bump: bumps.vault_account,
    });
    Ok(())
}
}