#[account]
#[derive(InitSpace)]
pub struct PayHistory {
    pub mandate: Pubkey,
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub payment_number: u32,
    pub bump: u8,
}