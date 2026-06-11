use anchor_lang::prelude::*;

#[error_code]
pub enum FlowBadgeError {
    #[msg("Composite score must be >= 400 to mint a badge.")]
    ScoreTooLow,

    #[msg("Badge already minted for this worker.")]
    BadgeAlreadyMinted,

    #[msg("Unauthorized caller — only FlowPay or FlowScore may call this.")]
    UnauthorizedCaller,

    #[msg("WorkerScoreAccount does not match the worker wallet.")]
    ScoreAccountMismatch,
}