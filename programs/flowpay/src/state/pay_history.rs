pub struct PayHistory {
    pub mandate: Pubkey,      // parent Flowpay PDA
    pub payer: Pubkey,        // who paid
    pub payee: Pubkey,        // who received
    pub amount: u64,
    pub timestamp: i64,
    pub payment_number: u32,
    pub bump: u8,
}