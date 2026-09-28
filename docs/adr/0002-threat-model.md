# ADR 0002: Threat model (testnet baseline)

Status: draft — needs independent review before this is trustworthy for real funds
Date: 2026-09-28

This is a first-pass threat model for `DamkeeperLockManager` and `DamkeeperVestingManager`
(`packages/contracts/src/`), written by the implementer, not a security reviewer. Brief.md
section 14.4 requires an independent review before mainnet — this document is not that review.

## Assets

- Escrowed ERC-20 tokens held by each manager contract.
- Admin control (`setCreationPaused`, `setTokenPolicy`, `transferAdmin`).

## Trust boundaries

- **Manager contract**: source of truth for who can withdraw/claim what, and when.
- **Frontend**: untrusted by the contract — it can only prepare transactions the wallet signs.
  All amounts, addresses and dates are re-derived from onchain reads before display.
- **Indexer / DB**: untrusted by the contract, read-only convenience layer. A wrong or stale
  DB row can mislead the UI, but can't move funds — every write to escrow requires a signed
  transaction against the manager contract, not against the indexer.
- **Admin**: can pause new creations and enable/disable/cap tokens. Explicitly cannot touch
  existing positions, sweep escrow, or reassign a beneficiary (see `packages/contracts/src/*.sol`
  — there is no function that does any of this).

## Known risks and how they're currently handled

| Risk | Mitigation in this codebase | Residual risk |
|---|---|---|
| Reentrancy on withdraw/claim | `ReentrancyGuard` + checks-effects-interactions (state updated before external transfer) | Standard OZ guard, not independently reviewed |
| Malicious/non-standard ERC-20 (fee-on-transfer, rebasing, no-return-value) | `SafeERC20`; `received == requested` balance check on deposit | Tokens must be explicitly admitted via `setTokenPolicy`; a token that changes behavior *after* being enabled is out of scope (brief.md 9.2) |
| Integer overflow in vesting math | `Math.mulDiv` used for `vestedAmount` | — |
| Admin key compromise | Two-step transfer, but testnet admin is a single EOA today (see ADR 0001) | **High** until moved to a tested multisig — do not treat testnet admin as production-grade |
| Reorg on Robinhood Chain | Indexer checkpoints per block; no deep reorg replay yet (see README "What's not real yet") | Indexer may show a stale/incorrect row after a reorg deeper than one cron cycle — the contract itself is unaffected, only the read cache |
| Direct token transfer to manager (donation) | Doesn't create a position or inflate any position's `amount`; `totalLiability` accounting uses `>=` against actual balance (brief.md 9.1) | Donated tokens are simply unrecoverable — no rescue function exists by design |
| Frontend showing wrong data | All balances/dates recomputed from indexed state at render time, not trusted from user input | Frontend bugs can mislead a user, but cannot move funds — the contract enforces every invariant itself |

## Explicitly out of scope for this build

- Formal verification / fuzzing beyond `forge test` unit coverage (`packages/contracts/test/`).
- Gas griefing / DoS analysis under adversarial network conditions.
- Front-running of `createLock`/`createVesting` (not applicable — these have no MEV-sensitive
  price component).
- Anything involving mainnet funds. Nothing here is deployed to mainnet and nothing should be
  until this document is replaced by a real independent review (brief.md 14.4, 15 Phase 4).

## Before mainnet (do not skip)

1. Independent review of `packages/contracts/src/*.sol` by someone who didn't write it.
2. Admin moved to a multisig with documented signers/threshold.
3. This document rewritten by the reviewer, not the implementer.
