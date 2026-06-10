pub struct Flowpay {
    pub payer: Pubkey,        // client
    pub payee: Pubkey,        // worker / freelancer
    pub amount: u64,          // USDC per interval
    pub token: Pubkey,        // token mint
    pub frequency: i64,       // seconds between payments
    pub next_payout: i64,     // when next payment is due
    pub active: bool,
    pub payment_count: u32,   // seeds PayHistory PDA
    pub bump: u8,
}