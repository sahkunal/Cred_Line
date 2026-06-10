#[account]
#[derive(InitSpace)]
pub struct LoanAccount {
    pub borrower: Pubkey,
    pub amount: u64,
    pub due_date: i64,
    pub repaid: bool,
    pub bump: u8,
}