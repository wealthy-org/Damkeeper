# Damkeeper

Token locks and vesting on Robinhood Chain. Full spec in [brief.md](brief.md).

**Status: live on testnet, not mainnet.** Two contracts are deployed and working on Robinhood
Chain Testnet (chain 46630), with a real recorded create → withdraw and create → claim cycle —
see [Testnet deployment](#testnet-deployment) below. Nothing is on mainnet, nothing has had an
independent security review. Don't treat this as audited.

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

### Real transaction proof

A full create → withdraw cycle (lock) and create → claim → claim-remainder cycle (vesting) were
run on testnet, plus a double-withdraw that correctly reverted — closing out brief.md's phase-2
exit criterion "semua transaksi contoh memiliki hash nyata":

| Action | Tx hash |
| --- | --- |
| `createLock` (100 EXMPL, 3 min unlock) | `0x4348f32c4de6499ae0e0f0c9d8ff2d21747c1326e189d6d011565080ae48afbd` |
| `withdraw` after unlock | `0xc125315cddec84bec37dd49a7f692a6ae0d7ca46d2ffa01362b0bdc9d322336b` |
| `withdraw` again → reverted `AlreadyWithdrawn` (expected) | — |
| `createVesting` (100 EXMPL, start now, 3 min, no cliff) | `0xcc490355f4fd55fc4907eacb96ccb423e2eed2e231830cbfc5f1a139913ba914` |
| `claim` mid-vesting (~5.6 EXMPL) | `0x142c5665b1e33f947d08f86bb29862169a92cfcc5d3a8e368a1acd1aa30c82b3` |
| `claim` after end (remaining ~94.4 EXMPL) | `0x6beb812004c3859ba11fb32a1f0af32f1955fa87e732ab2eb110752cc53c1401` |

### Source verification

**Verified.** Both contracts are verified on Robinhood's testnet Blockscout:
[LockManager](https://explorer.testnet.chain.robinhood.com/address/0x335b2fba8845efc3e74f8a4b4ad664d32eba0acf) ·
[VestingManager](https://explorer.testnet.chain.robinhood.com/address/0xfd91fe9daac8bdb886cd89a53d3ba40421cb6efd).

An earlier `forge verify-contract` attempt failed from this dev environment with a TLS error that
turned out to be an **ISP block/captive-portal page** (`blockpage.xlaxiata.id`) intercepting the
connection at the network level, not a problem with Robinhood's server — it worked once that
interception was bypassed.

### Try it yourself

1. A wallet that supports custom EVM networks (MetaMask, Phantom's EVM mode, Rabby, …) — add
   Robinhood Chain Testnet manually: chain ID `46630`, RPC `https://robinhood-testnet.g.alchemy.com/v2/{API_KEY}`
   (get a free key at [alchemy.com](https://alchemy.com), or use the public fallback in
   `lib/chains.ts`), explorer `https://explorer.testnet.chain.robinhood.com`.
2. Get free testnet ETH for gas — try, in order:
   - `https://faucet.testnet.chain.robinhood.com` (official; worked with no mainnet-balance
     requirement when we used it — 0.01 ETH per claim, once per 24h)
   - Alchemy's and QuickNode's faucets both reject a wallet with zero Ethereum mainnet balance
     (anti-bot), so they may not work for a brand-new wallet.
3. Get EXMPL from the in-app faucet: connect your wallet on `/app` and click **"Get test
   tokens"** — sends 1000 EXMPL, rate-limited to once per wallet per 24h
   (`apps/web/app/api/faucet/route.ts`). No need to ask anyone to manually transfer it.
4. Open the app, connect the wallet, go to **Create lock**, paste the EXMPL address above, fill
   in a beneficiary/amount/unlock date, approve, create. It shows up on the dashboard once the
   indexer catches up. The UI blocks submission and shows a banner if the wallet is on the wrong
   network (brief.md section 10).

### Transaction handling

The create-lock/create-vesting forms implement the transaction state machine from brief.md
section 10 (`lib/use-tx-flow.ts`): `Review → Awaiting wallet → Submitted → Included`, with
`User rejected`, `Reverted`, `Replaced` and `Cancelled` all surfaced distinctly instead of a
generic spinner. They also reset a stale non-zero allowance to zero before approving a new
amount, for tokens (USDT-style) that reject changing a non-zero allowance directly.

## Operations

[`docs/runbooks/deployment.md`](docs/runbooks/deployment.md) and
[`docs/runbooks/incident-response.md`](docs/runbooks/incident-response.md) cover redeploying
contracts and handling the failure modes in brief.md section 13 (RPC issues, indexer lag, a
misbehaving token, app downtime, suspected contract vulnerability). Written honestly — they flag
what hasn't actually been tested yet (e.g. database restore) rather than pretending it has.

## Stack and why it differs from the brief where it does

The brief (section 7) specs Foundry, PostgreSQL, and a standalone `apps/indexer` worker. This
build targets **Vercel + Neon** end to end, so two things changed to fit that host:

- **Database**: Neon Postgres (serverless HTTP driver, `@neondatabase/serverless` + Drizzle)
  instead of a self-hosted Postgres. Free tier is enough for V1A/V1B traffic.
- **Indexer**: Vercel has no persistent worker process, so the always-on Node worker in the
  brief becomes a **Cron-triggered serverless function** (`apps/web/app/api/cron/index/route.ts`).
  It backfills a bounded block range per run instead of streaming. Trade-off: less real-time, and
  the deep reorg/rolling-hash handling from brief section 11.2 is intentionally simplified — call
  this out before mainnet.
  - `vercel.json` registers a once-daily cron because **Vercel Hobby only allows daily crons** —
    a `*/5 * * * *` schedule gets the deploy rejected outright on Hobby. That daily run is just a
    backstop. The real 5-minute cadence comes from an external trigger:
    **cron-job.org** (free) hitting `https://<your-domain>/api/cron/index` every 5 minutes with
    header `Authorization: Bearer $CRON_SECRET`. On Vercel Pro, change the schedule in
    `vercel.json` back to `*/5 * * * *` and drop the external trigger.
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
forge test -vvv
```

24 tests, all passing:
- 21 unit tests (6 vesting + 15 lock) — brief.md section 14.1 coverage: timing, authorization,
  withdrawal, ERC-20 edge cases, admission, exit-while-paused, direct-transfer safety.
- 2 fuzz tests (512 runs each) — the vesting formula checked against an **independently written**
  reference model (not a copy of the contract's `mulDiv` call), per brief.md 14.2.
- 1 invariant test (128 runs × up to 8192 randomized calls) — a handler drives random
  create/withdraw/policy-update/direct-transfer sequences and asserts
  `balanceOf(manager) >= totalLiability` and that an independently ghost-tracked liability never
  diverges from the contract's own bookkeeping.

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
   the live testnet deployment; `CRON_SECRET` if you're using the cron-job.org trigger above).
3. Deploy. Set up the cron-job.org trigger (see above) since Hobby can't run the real cadence
   itself.

## What's not real yet

- No independent security review (brief.md 14.4) — `docs/adr/0002-threat-model.md` is a first
  pass by the implementer, explicitly not a substitute.
- Admin on both testnet contracts is a single EOA, not a multisig — fine for testnet, not
  acceptable for mainnet (brief.md 9.3, ADR 0001).
- Multi-wallet compatibility (MetaMask, Rabby, …), mobile device testing, and the phase-3
  operational evidence target (10 test wallets, 100+ flows, 72h clean observation — brief.md
  section 15) haven't been run. These need real devices/wallets and time, not something that can
  be simulated.
- Reorg/replay simulation for the indexer is out of scope for the current cron-based
  implementation (see the Stack section above).
- Nothing is on mainnet, and nothing should be until the phase gates in brief.md section 15 are
  actually met — this project intentionally stayed testnet-only since there's no budget for real
  funds or an audit right now.
- The landing page's numbers are demo data by design (brief.md section 1 and 18) — separate from
  the real testnet state shown in `/transparency` and `/status`.
