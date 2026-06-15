# cred_line 🔗

> On-chain credit infrastructure for the gig economy — built on Solana.

cred_line is a suite of Solana programs that lets freelancers and gig workers build a verifiable financial identity from their work history. Every payment received, every contract completed, every loan repaid — it all compounds into a score that unlocks real financial access, right on-chain.

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
Each payment CPIs into FlowScore → updates BOTH parties' reputation
        ↓
Anyone calls mint_badge once worker's score crosses 400 → soulbound badge
        ↓
Anyone calls update_badge periodically → tier upgrades as score climbs
        ↓
Score crosses pool minimum → worker can borrow USDC from FlowLend
        ↓
Loan repaid on time → FlowLend CPIs into FlowScore → score improves further
        ↓
Contract ends → badge stays. Forever.
```

---

## Programs

### 🔁 FlowPay
The recurring payment engine. A client creates a contract, approves an SPL delegate, and payments fire automatically at every interval — enforced entirely by Solana's on-chain clock, so no trusted backend is needed.

- `create_flowpay` — initializes the contract and SPL delegate
- `execute_flowpay` — fires once an interval has elapsed, transfers USDC, records `PayHistory`, and **CPIs into FlowScore only** to update both parties' scores
- `reapprove_flowpay` — tops up the delegate allowance without recreating the contract
- `cancel_flowpay` — closes the contract, revokes the delegate, returns rent
- `close_payment_history` — reclaims rent from old `PayHistory` records

### 📊 FlowScore
The reputation layer — **standalone, depends on nothing**. Every payment, success or failure, feeds into a composite score for both the worker and the client. Everyone starts at 500.

**Worker scoring:**
| Event | Change |
|---|---|
| Payment received | +10 |
| Loan repaid on time | +15 |
| Loan defaulted | −40 |

**Client scoring:**
| Event | Change |
|---|---|
| Payment sent successfully | +10 |
| Payment missed (reported) | −20 |

```rust
composite = 500 + payment_score - default_penalty   // capped 0–1000
```

A missed payment only penalizes the **client** — the worker is never punished for someone else's failure. FlowScore exposes one shared `ScoreAccount` (seeded by wallet) used for both clients and workers.

### 🏅 FlowBadge
Soulbound reputation NFTs that live in a worker's wallet permanently. Anyone can call `mint_badge` once a worker's score crosses 400 — it reads `ScoreAccount` directly (no CPI, just an account reference via `seeds::program`). `update_badge` is called periodically to re-sync the tier as the score changes.

| Tier | Score |
|---|---|
| 🥉 Bronze | 400+ |
| 🥈 Silver | 600+ |
| 🥇 Gold | 750+ |
| 💎 Platinum | 900+ |

Badges are independent of the contract's lifecycle — cancelling a FlowPay contract never affects an existing badge.

### 🏦 FlowLend
Emergency USDC lending, gated by reputation. Workers with a composite score above the pool's minimum threshold can borrow directly from a PDA-owned liquidity pool.

- `borrow` — reads `ScoreAccount` (no CPI), checks `composite >= pool.minimum_score`, transfers USDC from the pool's vault, creates a `LoanAccount` with a due date
- `repay` — returns USDC to the vault, closes `LoanAccount`, and **CPIs into FlowScore** with `RepaidOnTime` or `Defaulted`

---

## Program Architecture

```text
flowpay/
├── instructions/
│   ├── create_flowpay.rs       → init contract + SPL approve
│   ├── execute_flowpay.rs       → transfer + record history + CPI → FlowScore
│   ├── reapprove_flowpay.rs     → renew delegate allowance
│   ├── cancel_flowpay.rs        → revoke delegate, close contract
│   └── close_payment_history.rs → reclaim rent from old records
└── state/
    ├── flowpay.rs               → contract state
    └── pay_history.rs           → payment records

flowscore/
├── instructions/
│   └── update_score.rs
│       ├── update_score_on_payment   → two-sided (payer + payee)
│       └── report_missed_payment     → payer-only penalty
└── state/
    └── score.rs
        └── ScoreAccount
            ├── payment_score
            ├── default_penalty
            ├── composite
            ├── total_contracts
            ├── total_earned
            ├── kyc_verified     (placeholder for future oracle)
            └── kyc_provider     (placeholder for future oracle)

flowbadge/
├── instructions/
│   ├── mint_badge.rs    → anyone-callable, reads ScoreAccount, mints once
│   └── update_badge.rs  → anyone-callable, re-syncs tier
└── state/
    └── badge.rs
        └── BadgeAccount
            ├── composite_score
            ├── total_contracts
            ├── total_earned
            ├── member_since
            └── tier

flowlend/
├── instructions/
│   ├── borrow.rs   → reads ScoreAccount, transfers from pool
│   └── repay.rs    → repays loan, CPI → FlowScore
└── state/
    ├── loan.rs   → LoanAccount (amount, due_date, repaid)
    └── pool.rs   → LendingPool (pool ATA, minimum_score, liquidity)
```

---

## Account Seeds

| Account | Seeds |
|---|---|
| Flowpay PDA | `["flowpay", payer, payee]` |
| PayHistory PDA | `["payment_history", flowpay, payment_count]` |
| ScoreAccount | `["score", wallet]` *(shared type, used for clients & workers)* |
| BadgeAccount | `["badge", worker_wallet]` |
| LoanAccount | `["loan", worker_wallet]` |
| LendingPool | `["pool"]` |

---

## Cross-Program CPI Flow

```
FlowPay (execute_flowpay)
  └── CPI → FlowScore (update_score_on_payment)   [writes — both sides scored]

FlowLend (repay)
  └── CPI → FlowScore (process_loan: RepaidOnTime | Defaulted)   [writes]

FlowBadge (mint_badge / update_badge)
  └── reads FlowScore.ScoreAccount   [no CPI — account reference only]

FlowLend (borrow)
  └── reads FlowScore.ScoreAccount   [no CPI — account reference only]

FlowScore
  └── depends on nothing. Zero outgoing CPIs.
```

**Rule of thumb:** CPI = calling another program's instruction to *write* state. Reading another program's account is just an account reference with `seeds::program = other_program::ID` — no CPI required.

---

## Tech Stack

- **Solana** — L1
- **Anchor** — program framework
- **SPL Token** — USDC transfers via delegate, on-chain clock enforcement
- **Rust + LiteSVM** — programs and fast local integration tests

---

## Getting Started

```bash
git clone https://github.com/sahkunal/Cred_Line
cd Cred_Line

anchor build
cargo test -- --nocapture
```

> Program IDs for FlowScore, FlowPay, FlowBadge, and FlowLend need updating in each program's `declare_id!`, and FlowBadge/FlowLend's `Cargo.toml` need `flowscore = { path = "../flowscore", features = ["cpi"] }` to read its account types.

---

## Deployment Order

```
1. FlowScore   ← depends on nothing, deploy first
2. FlowPay     ← CPI → FlowScore
3. FlowBadge   ← reads FlowScore
4. FlowLend    ← reads + CPI → FlowScore
```

---
## Devnet Deployment

| Program   | Program ID                                     | Deployment Transaction                                                                     |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| FlowPay   | `3Sdo2Uf816kQ2ue5akczvnywBxxYRnhe85zoHqi8YnHK` | `3AaPQrDtYhf5gWBvLrAjDuHqpZSTjh6BJVpboSnKNcCp44KjjhPwCLowGKMmi6KtrAk131vQtTCD1xcgnLxBCbnG` |
| FlowScore | `BGnsrKSkgDvrhqFgcgh7LYzMaGUuux9KLxW38NXMaeMY` | `3VarDkFViLzQUkx9hFypma3HbA7U512EoyCQJzbagJvTLuhf3k7osbP3F2dsRgN8ixyHonDjtGvkB9TqFJ8Ss2Ni` |
| FlowBadge | `9dvHFYb1gz3ebxqLXo2h42XLQt314dR29m646hdNCQp4` | `4GzTqmyg5gvaxAeQzGomWzWhsbUNUD2NGkzMTQkfqMxmVBup46nf2MHEnALBh439JuCBKNvcTm7EkbukSi3Mg9Gj` |
| FlowLend  | `wiSgdztdU5SMzDWpBPT6UrV4c4i2kW391h55Ct2QDwh`  | `aaCCY7vpvPWaaYnMEnmr4ASW5bHrUwg4Ehi6vrWkkNZgcKuPYxRzGswNVS1t1ajfsyJVk2k63ycXHjCrrqg16Pj`  |

**Deployment Status:** ✅ All programs successfully deployed to Solana Devnet.


## What's Next

- [ ] `initialize_pool` / deposit instruction for FlowLend liquidity providers
- [ ] Dispute resolution instruction in FlowPay
- [ ] Client score gating — workers can check a client's score before accepting a contract
- [ ] Oracle integration for KYC fields (`kyc_verified`, `kyc_provider`) already reserved in `ScoreAccount`

---

## License

MIT
