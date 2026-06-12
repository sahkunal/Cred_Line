# cred_line 🔗

> On-chain credit infrastructure for the gig economy — built on Solana.

cred_line is a suite of Solana programs that lets freelancers build a verifiable financial identity from their work history. Every payment received, every contract completed, every loan repaid — it all compounds into a score that unlocks real financial access, right on-chain.

No credit bureau. No bank approval. Just proof of work.

---

## The Problem

Freelancers and gig workers get paid, but that payment history disappears into nothing. There's no system that says *"this person has been paid reliably for 18 months and always repays what they borrow."* Traditional finance doesn't see them. DeFi doesn't either.

cred_line fixes that.

---

## How It Works

```
Client creates contract → Worker gets paid every interval
        ↓
Each payment builds the worker's FlowScore
        ↓
Score crosses 400 → Soulbound badge minted to wallet
        ↓
Score crosses 600 → Worker can borrow USDC from FlowLend
        ↓
Loan repaid on time → Score improves further
        ↓
Contract ends → Badge stays. Forever.
```

---

## Programs

### 🔁 FlowPay
The recurring payment engine. A client creates a contract, approves an SPL delegate, and payments fire automatically at every interval. When a payment lands, it CPIs into FlowScore to update both parties' reputation.

- `create_flowpay` — initializes the contract and SPL delegate
- `execute_flowpay` — fires on each interval, transfers USDC, records history
- `cancel_flowpay` — closes the contract, revokes delegate, returns rent

### 📊 FlowScore
The reputation layer. Every payment success or failure, every loan event — it all feeds into a composite score for both the worker and the client. Workers start at 500. Scores are earned, not assigned.

**Worker scoring:**
| Event | Change |
|---|---|
| Payment received | +10 |
| Missed deliverable | −20 |
| Loan repaid on time | +15 |
| Loan defaulted | −40 |

**Client scoring:**
| Event | Change |
|---|---|
| Payment sent | +5 |
| Insufficient funds | −30 |
| Delegate revoked early | −50 |

Both sides have skin in the game.

### 🏅 FlowBadge
Soulbound reputation NFTs that live in the worker's wallet permanently. They're minted automatically by FlowPay once a worker's composite score crosses 400, and upgraded by FlowScore as the score climbs.

| Tier | Score |
|---|---|
| 🥉 Bronze | 400+ |
| 🥈 Silver | 600+ |
| 🥇 Gold | 800+ |
| 💎 Platinum | 900+ |

Tiers only go up. A bad month doesn't erase what was earned.

### 🏦 FlowLend
Emergency USDC lending, gated by reputation. Workers with a composite score above the pool's minimum threshold can borrow directly from the lending pool. Repayment is tracked on-chain and feeds back into FlowScore.

- `borrow` — checks score, transfers USDC from pool vault, creates a LoanAccount with a 30-day due date
- `repay` — returns USDC to vault, closes LoanAccount, CPIs into FlowScore with `RepaidOnTime` or `Defaulted`

---
## Program Architecture

```text
flowpay/

├── instructions/
│   ├── create_flowpay.rs
│   │   └── Create payment agreement & approve SPL token spending
│   │
│   ├── execute_flowpay.rs
│   │   └── Execute installment payment
│   │       ├── Transfer funds
│   │       ├── CPI → FlowScore
│   │       └── CPI → FlowBadge
│   │
│   ├── reapprove_flowpay.rs
│   │   └── Renew token spending approval
│   │
│   ├── cancel_flowpay.rs
│   │   └── Cancel active payment agreement
│   │
│   └── close_payment_history.rs
│       └── Close completed payment history account
│
└── state/
    ├── flowpay.rs
    │   └── Payment contract state
    │
    └── pay_history.rs
        └── Payment execution records


flowscore/

├── instructions/
│   ├── state.rs
│   │   └── Initialize score accounts
│   │
│   └── update_score.rs
│       └── Process payment & lending events
│
└── state/
    └── score.rs
        └── ScoreAccount
            ├── payment_score
            ├── default_penalty
            ├── composite_score
            ├── total_contracts
            ├── total_earned
            └── kyc_verified


flowbadge/

├── instructions/
│   ├── mint_badge.rs
│   │   └── Mint reputation badge
│   │       └── Triggered by FlowPay activity
│   │
│   └── update_badge.rs
│       └── Upgrade badge tier
│
└── state/
    ├── badge.rs
    │   └── BadgeAccount
    │
    ├── score.rs
    │   └── Score reference for eligibility
    │
    └── tier.rs
        └── Bronze → Silver → Gold → Platinum → Diamond


flowlend/

├── instructions/
│   ├── borrow.rs
│   │   └── Score validation + loan disbursement
│   │
│   └── repay.rs
│       └── Loan repayment
│           └── CPI → FlowScore
│
└── state/
    ├── loan.rs
    │   └── LoanAccount
    │       ├── amount
    │       ├── due_date
    │       └── repaid
    │
    ├── vault.rs
    │   └── VaultAccount
    │       ├── total_deposited
    │       └── total_lent
    │
    ├── pool.rs
    │   └── LendingPool
    │       ├── minimum_score
    │       └── available_liquidity
    │
    └── score.rs
        └── Credit score reference
```

---

## Account Seeds

| Account | Seeds |
|---|---|
| Flowpay PDA | `["flowpay", client, worker]` |
| WorkerScoreAccount | `["worker_score", worker_wallet]` |
| ClientScoreAccount | `["client_score", client_wallet]` |
| BadgeAccount | `["badge", worker_wallet]` |
| LoanAccount | `["loan", worker_wallet]` |
| VaultAccount | `["vault"]` |
| LendingPool | `["lending_pool"]` |

---

## Cross-Program CPI Flow

```
FlowPay (execute_flowpay)
  └── CPI → FlowScore (update_score)
  └── CPI → FlowBadge (mint_badge)     ← only if score >= 400

FlowScore (update_score)
  └── CPI → FlowBadge (update_badge)   ← on every score change

FlowLend (repay)
  └── CPI → FlowScore (process_loan)   ← RepaidOnTime or Defaulted
```

---

## Tech Stack

- **Solana** — L1
- **Anchor** — program framework
- **SPL Token** — USDC transfers via delegate
- **Rust** — all programs

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/cred_line
cd cred_line

# Install dependencies
yarn install

# Build all programs
anchor build

# Run tests
anchor test
```

> **Note:** Program IDs for FlowScore, FlowPay, FlowBadge, and FlowLend need to be updated in each program's `declare_id!` and cross-program constants before deployment.

---

## Deployment Order

Programs must be deployed in dependency order:

```
1. FlowScore    — no external dependencies
2. FlowBadge    — depends on FlowScore (reads WorkerScoreAccount)
3. FlowPay      — depends on FlowScore + FlowBadge (CPIs both)
4. FlowLend     — depends on FlowScore (CPIs on repay)
```

---

## What's Next

- [ ] Oracle integration for `WorkerMissedDeliverable` (currently requires manual attestation)
- [ ] `total_contracts` and `total_earned` tracking in FlowBadge
- [ ] Dispute resolution instruction in FlowPay
- [ ] Liquidity provider deposits into FlowLend pool
- [ ] Client score gating — workers can check a client's score before accepting a contract

---

## License

MIT
