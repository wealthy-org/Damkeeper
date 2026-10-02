import { db } from "../db/client";
import { deployments, tokens, tokenPolicies, chainCheckpoints } from "../db/schema";

const CHAIN_ID = 4663;
const ADMIN = "0x9178b573219c55586bbaf51ecb24acfb27bb7681";
const LOCK_MANAGER = "0x2414e58801fabe792debd2c8930fc5ff3cd004fe";
const VESTING_MANAGER = "0xc07d54bd8e87442db58f6a0ccca71489307c70f5";
const TOKEN = "0x8fc5e1dfaeb1a4311cbbf8a387f3db530b78f3e0";
const DEPLOY_TX_HASH = "0x8d886dabf633a00d19f6c50d2686df65ef87718a1c2f66eb9507d8df0bf3d679";
const DEPLOY_BLOCK = 78024101n;
const VESTING_DEPLOY_TX_HASH = "0x4569e1352e34cd85405adc3b699d8464258a577b6fd84e302f112e7037369160";
const VESTING_DEPLOY_BLOCK = 78059319n;

async function main() {
  await db
    .insert(deployments)
    .values([
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        kind: "lock",
        version: "0.1.0",
        deployTxHash: DEPLOY_TX_HASH,
        deployBlock: DEPLOY_BLOCK,
        abiHash: "mainnet-lock-manager-v0.1.0",
        sourceCommit: "mainnet-launch",
        verifiedSourceUrl: `https://robinhoodchain.blockscout.com/address/${LOCK_MANAGER}`,
        admin: ADMIN,
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        kind: "vesting",
        version: "0.1.0",
        deployTxHash: VESTING_DEPLOY_TX_HASH,
        deployBlock: VESTING_DEPLOY_BLOCK,
        abiHash: "mainnet-vesting-manager-v0.1.0",
        sourceCommit: "mainnet-launch",
        verifiedSourceUrl: `https://robinhoodchain.blockscout.com/address/${VESTING_MANAGER}`,
        admin: ADMIN,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(tokens)
    .values({
      chainId: CHAIN_ID,
      address: TOKEN,
      symbol: "DAM",
      name: "Damkeeper Token",
      decimals: 18,
      supportNote: "Official Damkeeper token on Robinhood Chain Mainnet.",
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
        lastChangedBlock: DEPLOY_BLOCK,
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        token: TOKEN,
        enabled: true,
        liabilityCap: "10000000000000000000000000",
        lastChangedBlock: VESTING_DEPLOY_BLOCK,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(chainCheckpoints)
    .values([
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        lastBlock: DEPLOY_BLOCK,
        lastBlockHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        confirmationTier: "sequencer",
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        lastBlock: VESTING_DEPLOY_BLOCK,
        lastBlockHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        confirmationTier: "sequencer",
      },
    ])
    .onConflictDoNothing();

  console.log("Seeded mainnet deployment rows successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
