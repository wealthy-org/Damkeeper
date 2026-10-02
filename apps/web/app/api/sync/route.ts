import { createPublicClient, http, parseEventLogs } from "viem";
import { db } from "@/db/client";
import { positions, positionEvents, chainCheckpoints } from "@/db/schema";
import { ensureTokenMetadata } from "@/lib/token-metadata";
import { and, eq } from "drizzle-orm";
import { chainById, robinhoodMainnet } from "@/lib/chains";
import { lockManagerAbi, vestingManagerAbi } from "@/lib/abi";

// POST /api/sync
// On-Demand Indexing: ingests a confirmed transaction receipt immediately,
// parses emitted events, and saves them to Postgres without waiting for a cron cycle.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const txHash = body?.txHash as `0x${string}` | undefined;
  const targetChainId = Number(body?.chainId ?? robinhoodMainnet.id);

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return Response.json({ error: "Invalid transaction hash" }, { status: 400 });
  }

  const chain = chainById(targetChainId);
  if (!chain) {
    return Response.json({ error: `Unsupported chain ID: ${targetChainId}` }, { status: 400 });
  }

  try {
    const client = createPublicClient({ chain, transport: http() });
    const receipt = await client.getTransactionReceipt({ hash: txHash }).catch(() => null);

    if (!receipt) {
      return Response.json({ error: "Transaction receipt not found yet" }, { status: 404 });
    }

    if (receipt.status !== "success") {
      return Response.json({ error: "Transaction reverted on-chain" }, { status: 400 });
    }

    const combinedAbi = [...lockManagerAbi, ...vestingManagerAbi] as const;
    const parsedLogs = parseEventLogs({
      abi: combinedAbi,
      logs: receipt.logs,
    });

    const syncedEvents = [];

    for (const log of parsedLogs) {
      const managerAddress = log.address.toLowerCase();
      const eventName = log.eventName;
      const args = log.args as Record<string, unknown>;
      const positionId = args.id as bigint;

      if (!positionId) continue;

      // 1. Insert into positionEvents
      await db
        .insert(positionEvents)
        .values({
          chainId: targetChainId,
          managerAddress,
          positionId,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          txHash: receipt.transactionHash,
          logIndex: log.logIndex,
          eventName,
          payload: JSON.stringify(args, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          ),
          canonical: true,
        })
        .onConflictDoNothing();

      // 2. Insert into positions if Created
      if (eventName === "LockCreated") {
        const tokenAddress = (args.token as string).toLowerCase();
        await ensureTokenMetadata(client, targetChainId, tokenAddress);
        await db
          .insert(positions)
          .values({
            chainId: targetChainId,
            managerAddress,
            positionId,
            kind: "lock",
            token: tokenAddress,
            creator: (args.creator as string).toLowerCase(),
            beneficiary: (args.beneficiary as string).toLowerCase(),
            amount: ((args.amount as bigint) ?? 0n).toString(),
            createdAt: args.createdAt as bigint,
            unlockTime: (args.unlockTime as bigint) ?? null,
            withdrawn: false,
            indexedAtBlock: receipt.blockNumber,
          })
          .onConflictDoNothing();
      }

      if (eventName === "VestingCreated") {
        const tokenAddress = (args.token as string).toLowerCase();
        await ensureTokenMetadata(client, targetChainId, tokenAddress);
        await db
          .insert(positions)
          .values({
            chainId: targetChainId,
            managerAddress,
            positionId,
            kind: "vesting",
            token: tokenAddress,
            creator: (args.creator as string).toLowerCase(),
            beneficiary: (args.beneficiary as string).toLowerCase(),
            amount: ((args.amount as bigint) ?? 0n).toString(),
            claimedAmount: "0",
            createdAt: args.createdAt as bigint,
            startTime: (args.startTime as bigint) ?? null,
            cliffTime: (args.cliffTime as bigint) ?? null,
            endTime: (args.endTime as bigint) ?? null,
            withdrawn: false,
            indexedAtBlock: receipt.blockNumber,
          })
          .onConflictDoNothing();
      }

      // 3. Update if Withdrawn or Claimed
      if (eventName === "LockWithdrawn") {
        await db
          .update(positions)
          .set({ withdrawn: true, indexedAtBlock: receipt.blockNumber })
          .where(
            and(
              eq(positions.chainId, targetChainId),
              eq(positions.managerAddress, managerAddress),
              eq(positions.positionId, positionId)
            )
          );
      }

      if (eventName === "VestingClaimed") {
        await db
          .update(positions)
          .set({
            claimedAmount: (args.cumulativeClaimed as bigint).toString(),
            indexedAtBlock: receipt.blockNumber,
          })
          .where(
            and(
              eq(positions.chainId, targetChainId),
              eq(positions.managerAddress, managerAddress),
              eq(positions.positionId, positionId)
            )
          );
      }

      // 4. Update Checkpoint
      await db
        .insert(chainCheckpoints)
        .values({
          chainId: targetChainId,
          managerAddress,
          lastBlock: receipt.blockNumber,
          lastBlockHash: receipt.blockHash,
          confirmationTier: "sequencer",
        })
        .onConflictDoUpdate({
          target: [chainCheckpoints.chainId, chainCheckpoints.managerAddress],
          set: {
            lastBlock: receipt.blockNumber,
            lastBlockHash: receipt.blockHash,
            updatedAt: new Date(),
          },
        });

      syncedEvents.push({ eventName, positionId: positionId.toString(), managerAddress });
    }

    return Response.json({
      ok: true,
      synced: true,
      blockNumber: receipt.blockNumber.toString(),
      events: syncedEvents,
    });
  } catch (err) {
    console.error("Error in on-demand /api/sync:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
