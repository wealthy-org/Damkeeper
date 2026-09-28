# Damkeeper

Token locks and vesting on Robinhood Chain. Full spec in [brief.md](brief.md).

## Layout

```
apps/web/          Next.js app — landing, dashboard, create flows, proof pages, read API, cron indexer
packages/contracts/ Solidity (Foundry) — DamkeeperLockManager, DamkeeperVestingManager
packages/domain/    Shared vesting formula (must match the Solidity implementation exactly)
packages/config/    Deployment manifest template
```

The landing page (`apps/web/app/landing.html`, served by `apps/web/app/route.ts`) is copied
byte-for-byte from `reference-landing.html` — layout, CSS and animation are untouched.

## Stack and why it differs from the brief where it does

The brief (section 7) specs Foundry, PostgreSQL, and a standalone `apps/indexer` worker. This
build targets **Vercel + Neon** end to end, so two things changed to fit that host:

- **Database**: Neon Postgres (serverless HTTP driver, `@neondatabase/serverless` + Drizzle)
  instead of a self-hosted Postgres. Free tier is enough for V1A/V1B traffic.
- **Indexer**: Vercel has no persistent worker process, so the always-on Node worker in the
  brief becomes a **Cron-triggered serverless function** (`apps/web/app/api/cron/index/route.ts`,
  wired in `vercel.json`). It backfills a bounded block range per run instead of streaming.
  Trade-off: less real-time, and the deep reorg/rolling-hash handling from brief section 11.2 is
  intentionally simplified — call this out before mainnet.
  - Vercel Hobby cron only fires once a day. For the 5-minute cadence this needs, either upgrade
    to Vercel Pro, or keep the free tier and hit the same endpoint from
    **cron-job.org** (free) with `Authorization: Bearer $CRON_SECRET`.
- **RPC**: no paid API key is hardcoded. `lib/chains.ts` defaults to Blockscout's public
  JSON-RPC passthrough (free, rate-limited — fine for dev, not for production volume). Set
  `NEXT_PUBLIC_TESTNET_RPC_URL` / `NEXT_PUBLIC_MAINNET_RPC_URL` to a real provider (Alchemy has a
  free tier) before relying on this for real traffic.

Everything else — contract design, accounting rules, event schema, API shape — follows brief.md
directly.

## Local setup

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
# fill in DATABASE_URL from a free Neon project (https://neon.tech)
npm run db:generate --workspace=apps/web   # generate SQL migration from db/schema.ts
npm run db:migrate --workspace=apps/web    # apply it to Neon
npm run dev
```

## Contracts

```bash
cd packages/contracts
forge install foundry-rs/forge-std openzeppelin/openzeppelin-contracts
forge test -vvv
```

Nothing is deployed. `packages/config/manifest.example.json` stays a placeholder until a real
testnet deployment exists — see brief.md section 12 and phase 2.

## Deploying to Vercel

1. Push this repo, import it in Vercel, set **Root Directory** to `apps/web`.
2. Add env vars from `.env.example` in the Vercel project settings (`DATABASE_URL` from Neon is
   the only one required to boot).
3. `vercel.json` at the repo root registers the indexer cron — confirm it's picked up under
   Project → Cron Jobs after the first deploy, or use the cron-job.org fallback above on Hobby.

## What's not real yet

No contract is deployed, no manager address exists, and the landing page's numbers are demo data
by design (see brief.md section 1 and 18). Don't treat anything here as audited or mainnet-ready —
follow the phase gates in brief.md section 15 before touching real funds.
