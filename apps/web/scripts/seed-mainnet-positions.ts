import { db } from "../db/client";
import { positions, positionEvents, positionLabels, chainCheckpoints } from "../db/schema";

const CHAIN_ID = 4663;
const LOCK_MANAGER = "0x2414e58801fabe792debd2c8930fc5ff3cd004fe";
const TOKEN = "0x8fc5e1dfaeb1a4311cbbf8a387f3db530b78f3e0";
const FOUNDER = "0x9178b573219c55586bbaf51ecb24acfb27bb7681";

async function main() {
  // 1. Insert Mainnet Lock #1
  await db
    .insert(positions)
    .values({
      chainId: CHAIN_ID,
      managerAddress: LOCK_MANAGER,
      positionId: 1n,
      kind: "lock",
      token: TOKEN,
      creator: FOUNDER,
      beneficiary: FOUNDER,
      amount: "5000000000000000000000", // 5,000 DAM
      claimedAmount: "0",
      createdAt: 1790924202n,
      unlockTime: 1790924400n,
      withdrawn: true,
      indexedAtBlock: 78037185n,
    })
    .onConflictDoUpdate({
      target: [positions.chainId, positions.managerAddress, positions.positionId],
      set: {
        withdrawn: true,
        indexedAtBlock: 78037185n,
      },
    });

  // 2. Insert Events for Lock #1 (Created & Withdrawn)
  await db
    .insert(positionEvents)
    .values([
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        positionId: 1n,
        blockNumber: 78034294n,
        blockHash: "0xa57ba11d87604a94a036e0cc004c545e4b57ef8fd25013382529cc5184eceb47",
        txHash: "0xddb78f4bd247fbf4f2c01460f52c4407407a304ef312944c1320767929949f4e",
        logIndex: 53,
        eventName: "LockCreated",
        payload: JSON.stringify({
          id: "1",
          token: TOKEN,
          creator: FOUNDER,
          beneficiary: FOUNDER,
          amount: "5000000000000000000000",
          createdAt: "1790924202",
          unlockTime: "1790924400",
        }),
        canonical: true,
      },
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        positionId: 1n,
        blockNumber: 78037185n,
        blockHash: "0x80afb73557b65b1f282de5f48d21d455b9acb81c5885274dc0ed7509741e242c",
        txHash: "0x80b975f1612eadec11651a28fec5987f9e2332a0a596fc8c1038f4aa59d3e4c0",
        logIndex: 0,
        eventName: "LockWithdrawn",
        payload: JSON.stringify({
          id: "1",
          beneficiary: FOUNDER,
          amount: "5000000000000000000000",
        }),
        canonical: true,
      },
    ])
    .onConflictDoNothing();

  // 3. Label for Lock #1
  await db
    .insert(positionLabels)
    .values({
      chainId: CHAIN_ID,
      managerAddress: LOCK_MANAGER,
      positionId: 1n,
      label: "Genesis Mainnet Lock (5,000 $DAM)",
      setBy: FOUNDER,
    })
    .onConflictDoUpdate({
      target: [positionLabels.chainId, positionLabels.managerAddress, positionLabels.positionId],
      set: {
        label: "Genesis Mainnet Lock (5,000 $DAM)",
      },
    });

  // 4. Update Checkpoint for Lock Manager past withdrawal block
  await db
    .insert(chainCheckpoints)
    .values({
      chainId: CHAIN_ID,
      managerAddress: LOCK_MANAGER,
      lastBlock: 78037185n,
      lastBlockHash: "0x80afb73557b65b1f282de5f48d21d455b9acb81c5885274dc0ed7509741e242c",
      confirmationTier: "sequencer",
    })
    .onConflictDoUpdate({
      target: [chainCheckpoints.chainId, chainCheckpoints.managerAddress],
      set: {
        lastBlock: 78037185n,
        lastBlockHash: "0x80afb73557b65b1f282de5f48d21d455b9acb81c5885274dc0ed7509741e242c",
        updatedAt: new Date(),
      },
    });

  console.log("✓ Successfully seeded Mainnet Lock #1 position, events, and labels into database!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
