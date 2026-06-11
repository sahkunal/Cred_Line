use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Payment cannot be executed before the scheduled time")]
    PaymentTooEarly,

    #[msg("Only the payer or payee can perform this operation")]
    Unauthorized,

    #[msg("Invalid payment history for this flowpay")]
    InvalidPaymentHistory,

    #[msg("The mandate is not active")]
    FlopayInactive,

    #[msg("Invalid authority")]
    InvalidAuthority,

    #[msg("Insufficient token balance")]
    InsufficientBalance,
}