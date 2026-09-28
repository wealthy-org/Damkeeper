import { db } from "../db/client";
import { deployments, tokens, tokenPolicies, chainCheckpoints } from "../db/schema";

// Records the real testnet deployment made on 2026-09-28. Run once with:
//   DATABASE_URL=... npx tsx scripts/seed-testnet-deployment.ts
const CHAIN_ID = 46630;
const ADMIN = "0xe0945d83ea2d1a0ffef588748c67fca88acc99a5";
const LOCK_MANAGER = "0x335b2fba8845efc3e74f8a4b4ad664d32eba0acf";
const VESTING_MANAGER = "0xfd91fe9daac8bdb886cd89a53d3ba40421cb6efd";
const TOKEN = "0xb5b0f97b643306d540cae82f50970cf6f9d75538";
const SOURCE_COMMIT = "5574710f9791bc223a3a3e418c87d602f9e1c7e6";

async function main() {
  await db
    .insert(deployments)
    .values([
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        kind: "lock",
        version: "0.1.0",
        deployTxHash: "0xee85b93a4d6d7d7b460d86366178848da4c79c790e99b24f49c96e1f8d457530",
        deployBlock: 125692754n,
        abiHash: "a213f2bc29cbd3415436d3f830fd1d193d1c3b5c75e7079e5404c525ae04cf43",
        sourceCommit: SOURCE_COMMIT,
        verifiedSourceUrl: null, // Robinhood's testnet explorer TLS cert is expired — see docs/adr/0001
        admin: ADMIN,
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        kind: "vesting",
        version: "0.1.0",
        deployTxHash: "0x6f5daee28f019f724b7bc47a877064b358c0eff01fc355f742eae8c86826d808",
        deployBlock: 125692760n,
        abiHash: "5cc1818d9bef484a9d075348199cbd4df6c6466bc9631ce2fb547ec09f0e420d",
        sourceCommit: SOURCE_COMMIT,
        verifiedSourceUrl: null,
        admin: ADMIN,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(tokens)
    .values({
      chainId: CHAIN_ID,
      address: TOKEN,
      symbol: "EXMPL",
      name: "Example Token",
      decimals: 18,
      supportNote: "Plain ERC-20 deployed for testnet exercising only — not a real asset.",
    })
    .onConflictDoNothing();

  await db
    .insert(tokenPolicies)
    .values([
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        token: TOKEN,
        enabled: true,
        liabilityCap: "10000000000000000000000000",
        lastChangedBlock: 125697251n,
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        token: TOKEN,
        enabled: true,
        liabilityCap: "10000000000000000000000000",
        lastChangedBlock: 125697251n,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(chainCheckpoints)
    .values([
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        lastBlock: 125697251n,
        lastBlockHash: "0xea6c2bb5d34732f323d0910de2ce03ad981347a3e40e1b57fd074cefac69d51b",
        confirmationTier: "sequencer",
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        lastBlock: 125697251n,
        lastBlockHash: "0xea6c2bb5d34732f323d0910de2ce03ad981347a3e40e1b57fd074cefac69d51b",
        confirmationTier: "sequencer",
      },
    ])
    .onConflictDoNothing();

  console.log("Seeded testnet deployment rows.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
