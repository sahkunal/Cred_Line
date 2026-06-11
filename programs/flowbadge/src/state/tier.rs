// state/tier.rs
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, PartialOrd, Debug, InitSpace)]
pub enum BadgeTier {
    Bronze   = 0,
    Silver   = 1,
    Gold     = 2,
    Platinum = 3,
}

impl BadgeTier {
    pub fn min_score(&self) -> u32 {
        match self {
            BadgeTier::Bronze   => 400,
            BadgeTier::Silver   => 600,
            BadgeTier::Gold     => 800,
            BadgeTier::Platinum => 900,
        }
    }
    pub fn max_borrow_usdc(&self) -> u64 {
        match self {
            BadgeTier::Bronze   => 100_000_000,
            BadgeTier::Silver   => 500_000_000,
            BadgeTier::Gold     => 2_000_000_000,
            BadgeTier::Platinum => 5_000_000_000,
        }
    }
    pub fn label(&self) -> &'static str {
        match self {
            BadgeTier::Bronze   => "Bronze",
            BadgeTier::Silver   => "Silver",
            BadgeTier::Gold     => "Gold",
            BadgeTier::Platinum => "Platinum",
        }
    }
    pub fn from_score(composite: u32) -> Self {
        match composite {
            s if s >= 900 => BadgeTier::Platinum,
            s if s >= 800 => BadgeTier::Gold,
            s if s >= 600 => BadgeTier::Silver,
            _             => BadgeTier::Bronze,
        }
    }
}