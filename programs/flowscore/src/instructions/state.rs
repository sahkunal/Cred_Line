use anchor_lang::prelude::*;

// Worker score — full range 0..1000
// Seeds: ["worker_score", worker_wallet]
#[account]
#[derive(InitSpace)]
pub struct WorkerScoreAccount {
    pub authority:        Pubkey,   // worker wallet
    pub payment_score:    u32,      // cumulative +10 per success
    pub missed_penalty:   u32,      // cumulative +20 per miss
    pub loan_bonus:       u32,      // cumulative +15 per repay
    pub loan_penalty:     u32,      // cumulative +40 per default
    pub composite:        u32,      // 500 + earned - lost, capped 1000
    pub last_updated:     i64,
    pub bump:             u8,
}
// Client score — capped at 850 (no badge pathway)
// Seeds: ["client_score", client_wallet]
#[account]
#[derive(InitSpace)]
pub struct ClientScoreAccount {
    pub authority:        Pubkey,   // client wallet
    pub payment_score:    u32,      // cumulative +5 per success
    pub funds_penalty:    u32,      // cumulative +30 per insuff. funds
    pub revoke_penalty:   u32,      // cumulative +50 per revoked delegate
    pub composite:        u32,      // 500 + earned - lost, capped 850
    pub last_updated:     i64,
    pub bump:             u8,
}