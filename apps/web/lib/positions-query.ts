import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { createPublicClient, http, zeroAddress } from "viem";
import { db } from "@/db/client";
import { deployments, positionLabels, positions, tokens } from "@/db/schema";
import { chainById } from "@/lib/chains";
import { lockManagerAbi, vestingManagerAbi } from "@/lib/abi";
import { ensureTokenMetadata } from "@/lib/token-metadata";
import type { PositionView } from "@/lib/position-view";

export interface PositionFilter {
  chainId?: number;
  manager?: string;
  positionId?: bigint;
  wallet?: string;
  role?: "creator" | "beneficiary";
  kind?: "lock" | "vesting";
  token?: string;
  q?: string;
  limit?: number;
}

export async function listPositions(filter: PositionFilter = {}): Promise<PositionView[]> {
  const conditions: SQL[] = [];
  if (filter.chainId) conditions.push(eq(positions.chainId, filter.chainId));
  if (filter.manager) conditions.push(eq(positions.managerAddress, filter.manager.toLowerCase()));
  if (filter.positionId !== undefined) conditions.push(eq(positions.positionId, filter.positionId));
  if (filter.kind) conditions.push(eq(positions.kind, filter.kind));
  if (filter.token) conditions.push(eq(positions.token, filter.token.toLowerCase()));
  if (filter.wallet) {
    const w = filter.wallet.toLowerCase();
    if (filter.role === "creator") conditions.push(eq(positions.creator, w));
    else if (filter.role === "beneficiary") conditions.push(eq(positions.beneficiary, w));
    else conditions.push(or(eq(positions.creator, w), eq(positions.beneficiary, w))!);
  }
  if (filter.q) {
    const like = `%${filter.q.toLowerCase()}%`;
    const matches = [
      ilike(positions.token, like),
      ilike(positions.creator, like),
      ilike(positions.beneficiary, like),
      ilike(tokens.symbol, like),
      ilike(positionLabels.label, like),
    ];
    if (/^\d{1,18}$/.test(filter.q)) matches.push(eq(positions.positionId, BigInt(filter.q)));
    conditions.push(or(...matches)!);
  }

  const rows = await db
    .select({ p: positions, t: tokens, l: positionLabels })
    .from(positions)
    .leftJoin(tokens, and(eq(tokens.chainId, positions.chainId), eq(tokens.address, positions.token)))
    .leftJoin(
      positionLabels,
      and(
        eq(positionLabels.chainId, positions.chainId),
        eq(positionLabels.managerAddress, positions.managerAddress),
        eq(positionLabels.positionId, positions.positionId)
      )
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(positions.createdAt))
    .limit(Math.min(filter.limit ?? 50, 200));

  return rows.map(({ p, t, l }) => ({
    chainId: p.chainId,
    manager: p.managerAddress,
    positionId: p.positionId.toString(),
    kind: p.kind as "lock" | "vesting",
    token: p.token,
    tokenSymbol: t?.symbol ?? null,
    tokenName: t?.name ?? null,
    tokenDecimals: t?.decimals ?? null,
    creator: p.creator,
    beneficiary: p.beneficiary,
    amount: p.amount,
    claimedAmount: p.claimedAmount,
    createdAt: p.createdAt.toString(),
    unlockTime: p.unlockTime?.toString() ?? null,
    startTime: p.startTime?.toString() ?? null,
    cliffTime: p.cliffTime?.toString() ?? null,
    endTime: p.endTime?.toString() ?? null,
    withdrawn: p.withdrawn,
    label: l?.label ?? null,
    source: "indexed",
  }));
}

async function managerKind(chainId: number, manager: string): Promise<"lock" | "vesting" | null> {
  const [row] = await db
    .select({ kind: deployments.kind })
    .from(deployments)
    .where(and(eq(deployments.chainId, chainId), eq(deployments.managerAddress, manager)))
    .limit(1);
  if (row) return row.kind as "lock" | "vesting";
  if (manager === process.env.NEXT_PUBLIC_LOCK_MANAGER_ADDRESS?.toLowerCase()) return "lock";
  if (manager === process.env.NEXT_PUBLIC_VESTING_MANAGER_ADDRESS?.toLowerCase()) return "vesting";
  return null;
}

/**
 * One position by its full identity (brief.md 8.1). Falls back to reading the
 * contract directly when the indexer hasn't caught up yet, so a proof page
 * works right after creation (brief.md 10, create-lock step 8).
 */
export async function getPosition(chainId: number, manager: string, positionId: bigint): Promise<PositionView | null> {
  const managerAddr = manager.toLowerCase();

  const [indexed] = await listPositions({ chainId, manager: managerAddr, positionId, limit: 1 });
  if (indexed) return indexed;

  const chain = chainById(chainId);
  const kind = await managerKind(chainId, managerAddr);
  if (!chain || !kind) return null;

  const client = createPublicClient({ chain, transport: http() });
  try {
    if (kind === "lock") {
      const p = await client.readContract({ address: managerAddr as `0x${string}`, abi: lockManagerAbi, functionName: "getLock", args: [positionId] });
      if (p.beneficiary === zeroAddress) return null;
      const meta = await ensureTokenMetadata(client, chainId, p.token);
      return {
        chainId,
        manager: managerAddr,
        positionId: positionId.toString(),
        kind,
        token: p.token.toLowerCase(),
        tokenSymbol: meta.symbol,
        tokenName: meta.name,
        tokenDecimals: meta.decimals,
        creator: p.creator.toLowerCase(),
        beneficiary: p.beneficiary.toLowerCase(),
        amount: p.amount.toString(),
        claimedAmount: "0",
        createdAt: p.createdAt.toString(),
        unlockTime: p.unlockTime.toString(),
        startTime: null,
        cliffTime: null,
        endTime: null,
        withdrawn: p.withdrawn,
        label: await labelFor(chainId, managerAddr, positionId),
        source: "chain",
      };
    }
    const p = await client.readContract({ address: managerAddr as `0x${string}`, abi: vestingManagerAbi, functionName: "getVesting", args: [positionId] });
    if (p.beneficiary === zeroAddress) return null;
    const meta = await ensureTokenMetadata(client, chainId, p.token);
    return {
      chainId,
      manager: managerAddr,
      positionId: positionId.toString(),
      kind,
      token: p.token.toLowerCase(),
      tokenSymbol: meta.symbol,
      tokenName: meta.name,
      tokenDecimals: meta.decimals,
      creator: p.creator.toLowerCase(),
      beneficiary: p.beneficiary.toLowerCase(),
      amount: p.totalAmount.toString(),
      claimedAmount: p.claimedAmount.toString(),
      createdAt: p.createdAt.toString(),
      unlockTime: null,
      startTime: p.startTime.toString(),
      cliffTime: p.cliffTime.toString(),
      endTime: p.endTime.toString(),
      withdrawn: false,
      label: await labelFor(chainId, managerAddr, positionId),
      source: "chain",
    };
  } catch {
    return null;
  }
}

async function labelFor(chainId: number, manager: string, positionId: bigint) {
  const [row] = await db
    .select({ label: positionLabels.label })
    .from(positionLabels)
    .where(and(eq(positionLabels.chainId, chainId), eq(positionLabels.managerAddress, manager), eq(positionLabels.positionId, positionId)))
    .limit(1);
  return row?.label ?? null;
}
