use anchor_lang::prelude::*;


#[error_code]
pub enum FlowScoreError {
    #[msg("Payment is not yet overdue")]
    PaymentNotYetOverdue,
}