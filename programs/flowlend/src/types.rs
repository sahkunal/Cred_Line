use anchor_lang::prelude::*;
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum LoanEvent {
    /// Repaid on or before due_date → score +15
    RepaidOnTime,
    /// Repaid after due_date → score -40
    Defaulted,
}