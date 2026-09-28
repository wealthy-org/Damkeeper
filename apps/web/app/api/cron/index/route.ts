import { createPublicClient, http, parseAbiItem } from "viem";
import { db } from "@/db/client";
import { positions, positionEvents, chainCheckpoints, deployments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { chainById } from "@/lib/chains";

// Vercel has no persistent workers, so the indexer described in brief section 11
// runs as a Cron-triggered serverless function instead (see vercel.json).
// Each run: backfill a bounded range of new blocks per configured manager,
// upsert canonical event rows and position projections, then advance the checkpoint.
// This is a pragmatic port of the pipeline, not a full reorg-safe worker —
// deep reorg handling (rolling block hashes, replay) still belongs in apps/indexer
// if/when a always-on worker becomes available.

const MAX_BLOCK_RANGE = 2000n;

const LockCreated = parseAbiItem(
  "event LockCreated(uint256 indexed id, address indexed token, address indexed creator, address beneficiary, uint256 amount, uint64 createdAt, uint64 unlockTime)"
);
const LockWithdrawn = parseAbiItem(
  "event LockWithdrawn(uint256 indexed id, address beneficiary, uint256 amount)"
);
const VestingCreated = parseAbiItem(
  "event VestingCreated(uint256 indexed id, address indexed token, address indexed creator, address beneficiary, uint256 amount, uint64 startTime, uint64 cliffTime, uint64 endTime, uint64 createdAt)"
);
const VestingClaimed = parseAbiItem(
  "event VestingClaimed(uint256 indexed id, address beneficiary, uint256 amount, uint256 cumulativeClaimed)"
);

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const managers = await db.select().from(deployments);
  const results = [];

  for (const manager of managers) {
    const chain = chainById(manager.chainId);
    if (!chain) continue;

    const client = createPublicClient({ chain, transport: http() });
    const latestBlock = await client.getBlockNumber();

    const [checkpoint] = await db
      .select()
      .from(chainCheckpoints)
      .where(
        and(
          eq(chainCheckpoints.chainId, manager.chainId),
          eq(chainCheckpoints.managerAddress, manager.managerAddress)
        )
      )
      .limit(1);

    const fromBlock = checkpoint ? checkpoint.lastBlock + 1n : manager.deployBlock;
    if (fromBlock > latestBlock) {
      results.push({ manager: manager.managerAddress, skipped: true });
      continue;
    }
    const toBlock =
      latestBlock - fromBlock > MAX_BLOCK_RANGE ? fromBlock + MAX_BLOCK_RANGE : latestBlock;

    const events = manager.kind === "lock" ? [LockCreated, LockWithdrawn] : [VestingCreated, VestingClaimed];

    const logs = (
      await Promise.all(
        events.map((event) =>
          client.getLogs({
            address: manager.managerAddress as `0x${string}`,
            event,
            fromBlock,
            toBlock,
          })
        )
      )
    ).flat();

    logs.sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.logIndex - b.logIndex
        : a.blockNumber < b.blockNumber
          ? -1
          : 1
    );

    for (const log of logs) {
      const args = log.args as Record<string, unknown>;
      const positionId = args.id as bigint;

      await db
        .insert(positionEvents)
        .values({
          chainId: manager.chainId,
          managerAddress: manager.managerAddress,
          positionId,
          blockNumber: log.blockNumber!,
          blockHash: log.blockHash!,
          txHash: log.transactionHash!,
          logIndex: log.logIndex!,
          eventName: log.eventName!,
          payload: JSON.stringify(args, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          ),
          canonical: true,
        })
        .onConflictDoNothing();

      if (log.eventName === "LockCreated" || log.eventName === "VestingCreated") {
        await db
          .insert(positions)
          .values({
            chainId: manager.chainId,
            managerAddress: manager.managerAddress,
            positionId,
            kind: manager.kind,
            token: args.token as string,
            creator: args.creator as string,
            beneficiary: args.beneficiary as string,
            amount: ((args.amount as bigint) ?? 0n).toString(),
            createdAt: args.createdAt as bigint,
            unlockTime: (args.unlockTime as bigint) ?? null,
            startTime: (args.startTime as bigint) ?? null,
            cliffTime: (args.cliffTime as bigint) ?? null,
            endTime: (args.endTime as bigint) ?? null,
            indexedAtBlock: log.blockNumber!,
          })
          .onConflictDoNothing();
      }

      if (log.eventName === "LockWithdrawn") {
        await db
          .update(positions)
          .set({ withdrawn: true, indexedAtBlock: log.blockNumber! })
          .where(
            and(
              eq(positions.chainId, manager.chainId),
              eq(positions.managerAddress, manager.managerAddress),
              eq(positions.positionId, positionId)
            )
          );
      }

      if (log.eventName === "VestingClaimed") {
        await db
          .update(positions)
          .set({
            claimedAmount: (args.cumulativeClaimed as bigint).toString(),
            indexedAtBlock: log.blockNumber!,
          })
          .where(
            and(
              eq(positions.chainId, manager.chainId),
              eq(positions.managerAddress, manager.managerAddress),
              eq(positions.positionId, positionId)
            )
          );
      }
    }

    const finalBlock = await client.getBlock({ blockNumber: toBlock });

    await db
      .insert(chainCheckpoints)
      .values({
        chainId: manager.chainId,
        managerAddress: manager.managerAddress,
        lastBlock: toBlock,
        lastBlockHash: finalBlock.hash,
        confirmationTier: "sequencer",
      })
      .onConflictDoUpdate({
        target: [chainCheckpoints.chainId, chainCheckpoints.managerAddress],
        set: {
          lastBlock: toBlock,
          lastBlockHash: finalBlock.hash,
          updatedAt: new Date(),
        },
      });

    results.push({ manager: manager.managerAddress, fromBlock: fromBlock.toString(), toBlock: toBlock.toString(), events: logs.length });
  }

  return Response.json({ ok: true, results });
}
