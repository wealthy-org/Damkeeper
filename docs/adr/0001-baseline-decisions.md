# ADR 0001: Baseline product decisions

Status: accepted (testnet scope only — not frozen for mainnet)
Date: 2026-09-28

## Context

brief.md section 19 lists decisions that must be recorded before contract freeze. This ADR
records the defaults this build actually uses, so code and docs don't drift apart.

## Decisions

| Decision | Choice | Section |
|---|---|---|
| First release | LockManager first; VestingManager ships alongside it in this build (both exist, only LockManager is prioritized for testnet deploy) | 4 |
| Withdrawal wallet | Beneficiary is fixed at `createLock`/`createVesting`, immutable after | 5, 8.3 |
| Term mutation | None — no cancel, no extend, no beneficiary change, no top-up | 4.3, 8.3 |
| Cliff | Catch-up since start at cliff time, per the formula in 8.5 | 8.5 |
| Fee | Zero platform fee | 5 |
| Admission | Token must be explicitly enabled per manager via `setTokenPolicy` | 8.1, 9.2 |
| Pilot exposure | `liabilityCap` per token per manager, set to 0 by default at deploy | 9.3 |
| Admin | Two-step transfer (`transferAdmin` / `acceptAdmin`); starts as the deployer EOA for testnet — **must** move to a multisig before any mainnet deploy | 9.3 |
| RPC | Alchemy (free tier) for testnet; no mainnet RPC configured — no mainnet deploy planned until funded | 12 |
| Review | None yet. No independent security review has occurred. Nothing here should be treated as audited. | 14.4 |

## Consequences

- This build targets **testnet only**. `NEXT_PUBLIC_MAINNET_RPC_URL` and the mainnet chain
  config exist in code but nothing is deployed there, and nothing should be until an
  independent review happens and there's a funded multisig for admin.
- Contract admin starts as a single EOA (the deployer's wallet) for testnet convenience. This is
  explicitly *not* acceptable for mainnet — brief.md section 9.3 requires a tested multisig.
