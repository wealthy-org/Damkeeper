import { db } from "../db/client";
import { positions, positionEvents } from "../db/schema";

// Records the real end-to-end proof cycle run on 2026-09-28 — see README.md
// "Real transaction proof". Run once with:
//   DATABASE_URL=... npx tsx scripts/seed-proof-positions.ts
const CHAIN_ID = 46630;
const LOCK_MANAGER = "0x335b2fba8845efc3e74f8a4b4ad664d32eba0acf";
const VESTING_MANAGER = "0xfd91fe9daac8bdb886cd89a53d3ba40421cb6efd";
const TOKEN = "0xb5b0f97b643306d540cae82f50970cf6f9d75538";
const DEPLOYER = "0xe0945d83ea2d1a0ffef588748c67fca88acc99a5";

async function main() {
  await db
    .insert(positions)
    .values([
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        positionId: 1n,
        kind: "lock",
        token: TOKEN,
        creator: DEPLOYER,
        beneficiary: DEPLOYER,
        amount: "100000000000000000000",
        claimedAmount: "0",
        createdAt: 1790603322n,
        unlockTime: 1790603501n,
        withdrawn: true,
        indexedAtBlock: 125726268n,
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        positionId: 1n,
        kind: "vesting",
        token: TOKEN,
        creator: DEPLOYER,
        beneficiary: DEPLOYER,
        amount: "100000000000000000000",
        claimedAmount: "100000000000000000000",
        createdAt: 1790603334n,
        startTime: 1790603334n,
        cliffTime: 0n,
        endTime: 1790603501n,
        withdrawn: false,
        indexedAtBlock: 125726333n,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(positionEvents)
    .values([
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        positionId: 1n,
        blockNumber: 125725196n,
        blockHash: "0x00650697bda41fb012592e5339f317c2529a002fe539a77d780990b3b37be1d3",
        txHash: "0x4348f32c4de6499ae0e0f0c9d8ff2d21747c1326e189d6d011565080ae48afbd",
        logIndex: 1,
        eventName: "LockCreated",
        payload: JSON.stringify({ token: TOKEN, creator: DEPLOYER, beneficiary: DEPLOYER, amount: "100000000000000000000" }),
      },
      {
        chainId: CHAIN_ID,
        managerAddress: LOCK_MANAGER,
        positionId: 1n,
        blockNumber: 125726268n,
        blockHash: "0x9e8f6f7e2eb2c914302edb851d81b68fcdb80b21722e64a16d242093b9a35074",
        txHash: "0xc125315cddec84bec37dd49a7f692a6ae0d7ca46d2ffa01362b0bdc9d322336b",
        logIndex: 2,
        eventName: "LockWithdrawn",
        payload: JSON.stringify({ beneficiary: DEPLOYER, amount: "100000000000000000000" }),
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        positionId: 1n,
        blockNumber: 125725258n,
        blockHash: "0xd200361e6b60fac0a3a3b3f7b139ec53c6a2823416af05d52e63d665c9af29b0",
        txHash: "0xcc490355f4fd55fc4907eacb96ccb423e2eed2e231830cbfc5f1a139913ba914",
        logIndex: 1,
        eventName: "VestingCreated",
        payload: JSON.stringify({ token: TOKEN, creator: DEPLOYER, beneficiary: DEPLOYER, amount: "100000000000000000000" }),
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        positionId: 1n,
        blockNumber: 125725288n,
        blockHash: "0x947df59585bdd607572f2af0b153d1556065562ce7f22b1d4719d53f1bd71304",
        txHash: "0x142c5665b1e33f947d08f86bb29862169a92cfcc5d3a8e368a1acd1aa30c82b3",
        logIndex: 0,
        eventName: "VestingClaimed",
        payload: JSON.stringify({ beneficiary: DEPLOYER, amount: "5660377358490566037", cumulativeClaimed: "5660377358490566037" }),
      },
      {
        chainId: CHAIN_ID,
        managerAddress: VESTING_MANAGER,
        positionId: 1n,
        blockNumber: 125726333n,
        blockHash: "0x926b80479caeb0057d6809369cc8d3d314f62d5627e10e24379894207ceb6211",
        txHash: "0x6beb812004c3859ba11fb32a1f0af32f1955fa87e732ab2eb110752cc53c1401",
        logIndex: 0,
        eventName: "VestingClaimed",
        payload: JSON.stringify({ beneficiary: DEPLOYER, amount: "94339622641509433963", cumulativeClaimed: "100000000000000000000" }),
      },
    ])
    .onConflictDoNothing();

  console.log("Seeded real proof positions and events.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
