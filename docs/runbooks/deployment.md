# Runbook: contract deployment

Applies to `packages/contracts/`. Testnet only, per
[docs/adr/0001](../adr/0001-baseline-decisions.md) — do not run this against mainnet without a
completed independent review (brief.md 14.4) and a multisig admin ready.

## Prerequisites

- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- `packages/contracts/.env` with `DEPLOYER_PRIVATE_KEY` and `TESTNET_RPC_URL` set
- Deployer wallet funded with testnet ETH (see README "Try it yourself" for faucets)
- `forge install foundry-rs/forge-std openzeppelin/openzeppelin-contracts --no-commit`

## Steps

1. **Run the test suite first.** Do not deploy on a red suite.
   ```bash
   cd packages/contracts && forge test
   ```
2. **Deploy the managers.**
   ```bash
   forge script script/Deploy.s.sol:Deploy --rpc-url $TESTNET_RPC_URL --broadcast
   ```
   Note the printed addresses. Deployment leaves creation **paused** and no token
   **enabled** by default (brief.md 9.3) — the contracts are inert until the next step.
3. **Verify source** (once the explorer is reachable — see the note in
   `manifest.testnet.json` about ISP-level interception we hit once):
   ```bash
   forge verify-contract <address> src/DamkeeperLockManager.sol:DamkeeperLockManager \
     --chain 46630 --verifier blockscout \
     --verifier-url https://explorer.testnet.chain.robinhood.com/api/ \
     --constructor-args $(cast abi-encode "constructor(address)" <admin-address>)
   ```
   Repeat for `DamkeeperVestingManager`.
4. **Enable a token and unpause creation** (only after you've decided the token and cap):
   ```bash
   forge script script/EnableToken.s.sol:EnableToken --rpc-url $TESTNET_RPC_URL --broadcast
   ```
5. **Update the manifest.** Add a new entry to `packages/config/manifest.testnet.json` with
   the real chain ID, address, tx hash, deploy block, abi hash, source commit, and
   verified-source URL. Never edit an existing entry's address — that field is the
   permanent record of what happened.
6. **Seed the database** so the app reflects the new deployment:
   ```bash
   DATABASE_URL=... npx tsx apps/web/scripts/seed-testnet-deployment.ts
   ```
   (Edit the script's constants first if this is a fresh deployment, not the original one.)
7. **Update `apps/web/.env`** (and the Vercel project's env vars) with the new
   `NEXT_PUBLIC_LOCK_MANAGER_ADDRESS` / `NEXT_PUBLIC_VESTING_MANAGER_ADDRESS`.
8. **Smoke test**: create a lock, wait for unlock, withdraw. Record the tx hashes in the
   README's "Real transaction proof" table — brief.md phase 2 explicitly wants this evidence,
   not just "it should work."

## Rollback

Contracts are immutable — there is no rollback for a bad deployment. If something is wrong
post-deploy:
- If creation is already open: call `setCreationPaused(true)` immediately (admin-only) to stop
  new positions. This does not affect existing withdraw/claim (by design — brief.md 9.3).
- Fix the issue, redeploy as a **new** contract (new address), update the manifest and `.env`
  again. Old positions on the broken contract keep working exactly as before; they are not
  migrated automatically (brief.md 12 — "Testnet tidak berubah menjadi mainnet" applies to any
  redeploy, not just the testnet→mainnet case).
