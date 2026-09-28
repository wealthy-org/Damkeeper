# Damkeeper

Token locks and vesting on Robinhood Chain. Full spec in [brief.md](brief.md).

**Status: live on testnet, not mainnet.** Two contracts are deployed and working on Robinhood
Chain Testnet (chain 46630) — see [Testnet deployment](#testnet-deployment) below. Nothing is on
mainnet, nothing has had an independent security review. Don't treat this as audited.

## Layout

```
apps/web/            Next.js app — landing, dashboard, create flows, proof pages, read API, cron indexer
packages/contracts/  Solidity (Foundry) — DamkeeperLockManager, DamkeeperVestingManager
packages/domain/     Shared vesting formula (must match the Solidity implementation exactly)
packages/config/     Deployment manifests (manifest.testnet.json is the real one)
docs/adr/            Baseline decisions and a first-pass threat model
```

The landing page (`apps/web/app/landing.html`, served by `apps/web/app/route.ts`) is copied
byte-for-byte from `reference-landing.html` — layout, CSS and animation are untouched. `/app`,
`/positions`, `/transparency`, `/status`, `/lock/new`, `/vesting/new` are a separate app shell
that reuses the same color tokens, type scale and icon set as the landing page (see
`apps/web/app/globals.css` and `apps/web/app/icon-sprite.tsx`).

## Testnet deployment

Deployed 2026-09-28 on Robinhood Chain Testnet (chain ID `46630`), for free — no mainnet funds
were involved anywhere in this. Full record in
[`packages/config/manifest.testnet.json`](packages/config/manifest.testnet.json).

| Contract | Address |
| --- | --- |
| `DamkeeperLockManager` | `0x335B2fba8845EfC3E74F8A4b4AD664D32Eba0AcF` |
| `DamkeeperVestingManager` | `0xfD91fe9daaC8BDb886cD89A53d3Ba40421cb6efd` |
| `ExampleToken` (EXMPL, test-only) | `0xb5b0f97B643306D540cAe82F50970cF6F9D75538` |

EXMPL is enabled on both managers and creation is unpaused, so the create-lock/create-vesting
forms work end to end today. It's a plain ERC-20 minted for testing — not a real asset, and not
what a real team would use (a real team points these forms at their own already-existing token's
contract address; Damkeeper doesn't issue tokens itself, see brief.md section 4.3).

**Source is not verified on the block explorer yet** — Robinhood's testnet Blockscout
(`explorer.testnet.chain.robinhood.com`) currently has an expired TLS certificate on their end,
which blocks `forge verify-contract`. Retry once that's fixed; it's tracked in the manifest file.

### Try it yourself

1. A wallet that supports custom EVM networks (MetaMask, Phantom's EVM mode, Rabby, …) — add
   Robinhood Chain Testnet manually: chain ID `46630`, RPC `https://robinhood-testnet.g.alchemy.com/v2/{API_KEY}`
   (get a free key at [alchemy.com](https://alchemy.com), or use the public fallback in
   `lib/chains.ts`), explorer `https://explorer.testnet.chain.robinhood.com`.
2. Get free testnet ETH for gas: the faucet at `faucet.testnet.chain.robinhood.com` worked
   without any mainnet-balance requirement when we used it; Alchemy's and QuickNode's faucets both
   require the wallet to already hold a small mainnet ETH balance (anti-bot), so they may reject a
   brand-new wallet.
3. Ask the project owner for a bit of EXMPL (or hold some already) — `cast send` a `transfer()`
   from whoever holds the supply, same as `packages/contracts/.env`'s `DEPLOYER_PRIVATE_KEY` did
   during setup.
4. Open the app, connect the wallet, go to **Create lock**, paste the EXMPL address above, fill
   in a beneficiary/amount/unlock date, approve, create. It shows up on the dashboard once the
   indexer catches up.

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
- **RPC**: no paid API key is hardcoded. `lib/chains.ts` defaults to a free public JSON-RPC
  passthrough (rate-limited — fine for dev, not for production volume). The testnet deployment
  above used a free-tier Alchemy key; get your own at alchemy.com before relying on this for real
  traffic.

Everything else — contract design, accounting rules, event schema, API shape — follows brief.md
directly.

## Local setup

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
# fill in DATABASE_URL from a free Neon project (https://neon.tech)
# fill in NEXT_PUBLIC_LOCK_MANAGER_ADDRESS / NEXT_PUBLIC_VESTING_MANAGER_ADDRESS from the
# table above to point the app at the live testnet deployment
npm run db:generate --workspace=apps/web   # generate SQL migration from db/schema.ts
npm run db:migrate --workspace=apps/web    # apply it to Neon
DATABASE_URL=... npx tsx apps/web/scripts/seed-testnet-deployment.ts   # record the deployment + token policy rows
npm run dev
```

## Contracts

```bash
cd packages/contracts
curl -L https://foundry.paradigm.xyz | bash && foundryup   # if forge isn't installed yet
forge install foundry-rs/forge-std openzeppelin/openzeppelin-contracts --no-commit
forge test -vvv   # 21 tests: 6 vesting + 15 lock, brief.md section 14.1 coverage
```

Redeploying (only ever to testnet unless mainnet is explicitly decided — see
[docs/adr/0001](docs/adr/0001-baseline-decisions.md)):

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url $TESTNET_RPC_URL --broadcast
forge script script/DeployTestToken.s.sol:DeployTestToken --rpc-url $TESTNET_RPC_URL --broadcast
forge script script/EnableToken.s.sol:EnableToken --rpc-url $TESTNET_RPC_URL --broadcast
```

## Deploying the web app to Vercel

1. Push this repo, import it in Vercel, set **Root Directory** to `apps/web`.
2. Add env vars from `.env.example` in the Vercel project settings (`DATABASE_URL` from Neon and
   the two `NEXT_PUBLIC_*_MANAGER_ADDRESS` values from the table above are what's required to see
   the live testnet deployment).
3. `vercel.json` at the repo root registers the indexer cron — confirm it's picked up under
   Project → Cron Jobs after the first deploy, or use the cron-job.org fallback above on Hobby.

## What's not real yet

- No independent security review (brief.md 14.4) — `docs/adr/0002-threat-model.md` is a first
  pass by the implementer, explicitly not a substitute.
- Admin on both testnet contracts is a single EOA, not a multisig — fine for testnet, not
  acceptable for mainnet (brief.md 9.3, ADR 0001).
- Source isn't verified on the explorer yet (TLS issue on their end, see above).
- Nothing is on mainnet, and nothing should be until the phase gates in brief.md section 15 are
  actually met — this project intentionally stayed testnet-only since there's no budget for real
  funds or an audit right now.
- The landing page's numbers are demo data by design (brief.md section 1 and 18) — separate from
  the real testnet state shown in `/transparency` and `/status`.
