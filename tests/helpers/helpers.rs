// PDA derivation helpers
pub fn derive_flowpay_pda(client: &Pubkey, worker: &Pubkey) -> (Pubkey, u8)
pub fn derive_pay_history_pda(flowpay: &Pubkey, count: u32) -> (Pubkey, u8)
pub fn derive_score_pda(wallet: &Pubkey) -> (Pubkey, u8)
pub fn derive_badge_pda(wallet: &Pubkey) -> (Pubkey, u8)
pub fn derive_loan_pda(borrower: &Pubkey) -> (Pubkey, u8)
pub fn derive_pool_pda() -> (Pubkey, u8)