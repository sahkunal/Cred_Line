use anchor_lang::prelude::*;


#[error_code]
pub enum FlowScoreError {
    #[msg("Payment is not yet overdue")]
    PaymentNotYetOverdue,
    
    #[msg("Unauthorized caller — only FlowPay may call this instruction.")]
    UnauthorizedCaller,

    #[msg("Score account does not match the provided wallet.")]
    ScoreAccountMismatch,
}