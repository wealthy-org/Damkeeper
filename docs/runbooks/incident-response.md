# Runbook: incident response

Mirrors brief.md section 13. Read that section for the full monitoring list and decision table —
this runbook is the "what do I actually type" version of it.

## First: figure out which layer is affected

| Symptom | Likely layer | Go to |
| --- | --- | --- |
| Wallet transactions fail or time out | RPC | [RPC issues](#rpc-issues) |
| Dashboard/positions look stale or wrong | Indexer | [Indexer lag](#indexer-lag) |
| App itself won't load (500s, blank pages) | Web app | [App down](#app-down) |
| A specific token behaves oddly (transfers failing, balances wrong) | Token issuer | [Misbehaving token](#misbehaving-token) |
| Something looks exploitable in the contracts | Contract | [Suspected contract vulnerability](#suspected-contract-vulnerability) — do this first, above all else |

## Suspected contract vulnerability

This takes priority over everything else below.

1. **Pause creation on both managers** (admin-only, does not touch existing funds):
   ```bash
   cast send <manager-address> "setCreationPaused(bool)" true --private-key $ADMIN_KEY --rpc-url $RPC_URL
   ```
2. Disable the create-lock/create-vesting forms in the frontend (feature flag or quick deploy
   with the forms replaced by a maintenance notice).
3. **Do not** promise an emergency rescue — there isn't one. The contracts have no sweep/rescue
   function by design (brief.md 9.1). Withdraw and claim keep working even while paused
   (brief.md 9.3) — this is intentional, not a bug to "fix" by pausing harder.
4. Write down exactly what's wrong and how it was found. This becomes the input to the
   independent review that has to happen before any further mainnet planning.
5. Communicate the fact pattern publicly on `/transparency` and/or `/status` — no vague banners,
   state what's known.

## RPC issues

1. Check `/status` and the RPC provider's own status page.
2. Switch `NEXT_PUBLIC_TESTNET_RPC_URL` (or mainnet equivalent) to a fallback provider —
   different vendor than the primary, per brief.md 12 ("Pilih endpoint utama dan fallback dari
   provider berbeda").
3. If you can't confirm chain state is being read correctly, **stop writes** — don't let users
   submit transactions against possibly-stale state. A read-only banner is better than a wrong
   transaction.
4. Redeploy the web app with the new RPC env var, or update it in Vercel and redeploy.

## Indexer lag

1. Check `/status` — `lastBlock` per manager tells you how far behind it is.
2. If the Vercel Cron / cron-job.org trigger isn't firing: check cron-job.org's execution history
   first (most common cause — see README's cron section). Re-verify the `CRON_SECRET` matches on
   both sides.
3. If the cron endpoint itself is failing, hit `/api/cron/index` manually with the bearer token
   and read the response — it returns per-manager results including error state.
4. Label data as stale in the UI while this is in progress (the API already returns `stale: true`
   when there's no checkpoint or it's old — surface that, don't hide it).
5. Once the trigger is healthy again, the indexer catches up on its own — it always resumes from
   the last checkpoint (brief.md 11.1), no manual backfill needed unless the checkpoint itself is
   corrupted (see below).

### If the checkpoint looks wrong (skipped or duplicated events)

The current indexer (`apps/web/app/api/cron/index/route.ts`) is a simplified cron-based version,
not the full reorg-aware worker from brief.md 11.2 — see README "Stack and why it differs". If
data looks duplicated or missing:

1. Query `position_events` for the affected manager/position — check for duplicate
   `(chainId, blockHash, txHash, logIndex)` rows (shouldn't happen, the primary key prevents it,
   but check) or gaps in `blockNumber` ordering.
2. Worst case: delete the `chain_checkpoints` row for that manager and let the next cron run
   re-backfill from `deployBlock`. This is safe — event ingestion is idempotent
   (`onConflictDoNothing` on the primary key), so replaying doesn't duplicate anything.
3. This does **not** affect user funds — the contract is always the source of truth for who can
   withdraw/claim what (brief.md section 6). A broken indexer is a UI/discovery problem only.

## App down

1. Check Vercel's deployment status and function logs.
2. If it's a bad deploy: roll back to the previous deployment in Vercel (one click). This does
   not touch the database or contracts.
3. Confirm after rollback that `NEXT_PUBLIC_LOCK_MANAGER_ADDRESS` /
   `NEXT_PUBLIC_VESTING_MANAGER_ADDRESS` in the restored deployment still match the current
   manifest — brief.md 12 requires failing loudly on a mismatch, not silently using stale
   addresses.
4. While the app is down, funds are still safe and direct contract interaction still works
   (`cast call` / `cast send`, or a block explorer's "write contract" tab) — this is worth
   telling affected users if the outage is long.

## Misbehaving token

1. Call `setTokenPolicy(token, false, cap)` to disable new deposits for that token immediately.
   This does not affect existing positions' withdraw/claim (brief.md 9.2).
2. Investigate what changed — pause by the issuer, blacklist, a fee turned on, etc.
3. Document the finding on `/transparency`. Don't claim the platform can undo issuer-side changes
   — it can't (brief.md 9.2, "Token yang dibekukan oleh issuer sendiri tetap dapat membuat payout
   gagal").

## Database restore

1. Neon keeps automatic point-in-time backups on the free tier (check retention window in the
   Neon dashboard — it's shorter than a paid plan's).
2. Restore to a new branch in Neon first, verify the data looks right, *then* point
   `DATABASE_URL` at it — never restore in place without checking.
3. After restore, run `apps/web/db/migrate.ts` to make sure the schema is current, then let the
   indexer re-backfill from its checkpoints (or reset checkpoints per the "Indexer lag" section
   above if the restore point is older than what's checkpointed).
4. This has not actually been tested end-to-end yet — brief.md 15 (phase 3) flags "restore
   database" as a required test that hasn't been run. Do a dry run before you need this for real.
