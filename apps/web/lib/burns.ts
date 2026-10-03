import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { createPublicClient, erc20Abi, formatUnits, http, parseEventLogs, zeroAddress } from "viem";
import { db } from "@/db/client";
import { burns, tokens } from "@/db/schema";
import { chainById } from "@/lib/chains";
import { ensureTokenMetadata } from "@/lib/token-metadata";
import { formatTokenAmount } from "@/lib/amounts";

export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

export interface BurnView {
  chainId: number;
  txHash: string;
  logIndex: number;
  token: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  tokenDecimals: number | null;
  burner: string;
  mode: "burn" | "dead";
  amount: string;
  totalSupplyAfter: string | null;
  blockNumber: string;
  timestamp: string;
}

export const burnProofPath = (b: Pick<BurnView, "chainId" | "txHash" | "logIndex">) =>
  `/burns/${b.chainId}/${b.txHash}${b.logIndex ? `?log=${b.logIndex}` : ""}`;

export const burnSymbol = (b: BurnView) => b.tokenSymbol ?? `${b.token.slice(0, 6)}…${b.token.slice(-4)}`;

export const formatBurnAmount = (b: BurnView, raw: string | bigint = b.amount) =>
  formatTokenAmount(BigInt(raw), b.tokenDecimals ?? 18);

/** Supply before the burn. A dead-address transfer never changes totalSupply. */
export function supplyBefore(b: BurnView): bigint | null {
  if (b.totalSupplyAfter === null) return null;
  const after = BigInt(b.totalSupplyAfter);
  return b.mode === "burn" ? after + BigInt(b.amount) : after;
}

/** Share of supply removed, as a display string without the sign. */
export function burnPct(b: BurnView): string {
  const before = supplyBefore(b);
  if (!before) return "—";
  // 8 decimal places of precision, done in bigint so huge supplies stay exact.
  const scaled = (BigInt(b.amount) * 10n ** 10n) / before;
  if (scaled === 0n) return "<0.000001";
  const pct = Number(formatUnits(scaled, 8));
  return pct >= 0.01 ? pct.toFixed(2) : pct.toFixed(6).replace(/0+$/, "");
}

export interface BurnFilter {
  chainId?: number;
  token?: string;
  burner?: string;
  txHash?: string;
  q?: string;
  limit?: number;
}

export async function listBurns(filter: BurnFilter = {}): Promise<BurnView[]> {
  const conditions: SQL[] = [];
  if (filter.chainId) conditions.push(eq(burns.chainId, filter.chainId));
  if (filter.token) conditions.push(eq(burns.token, filter.token.toLowerCase()));
  if (filter.burner) conditions.push(eq(burns.burner, filter.burner.toLowerCase()));
  if (filter.txHash) conditions.push(eq(burns.txHash, filter.txHash.toLowerCase()));
  if (filter.q) {
    const like = `%${filter.q.toLowerCase()}%`;
    conditions.push(or(ilike(burns.token, like), ilike(burns.burner, like), ilike(burns.txHash, like), ilike(tokens.symbol, like))!);
  }

  const rows = await db
    .select({ b: burns, t: tokens })
    .from(burns)
    .leftJoin(tokens, and(eq(tokens.chainId, burns.chainId), eq(tokens.address, burns.token)))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(burns.blockNumber), desc(burns.logIndex))
    .limit(filter.limit ?? 100);

  return rows.map(({ b, t }) => ({
    chainId: b.chainId,
    txHash: b.txHash,
    logIndex: b.logIndex,
    token: b.token,
    tokenSymbol: t?.symbol ?? null,
    tokenName: t?.name ?? null,
    tokenDecimals: t?.decimals ?? null,
    burner: b.burner,
    mode: b.mode === "dead" ? "dead" : "burn",
    amount: b.amount,
    totalSupplyAfter: b.totalSupplyAfter,
    blockNumber: b.blockNumber.toString(),
    timestamp: b.timestamp.toString(),
  }));
}

/**
 * Reads a confirmed transaction and stores every ERC-20 Transfer into 0x0 or 0x…dEaD.
 * Idempotent: re-syncing the same transaction is a no-op.
 */
export async function ingestBurnTx(chainId: number, txHash: `0x${string}`) {
  const chain = chainById(chainId);
  if (!chain) throw new BurnSyncError(`Unsupported chain ID: ${chainId}`, 400);

  const client = createPublicClient({ chain, transport: http() });
  const receipt = await client.getTransactionReceipt({ hash: txHash }).catch(() => null);
  if (!receipt) throw new BurnSyncError("Transaction receipt not found yet", 404);
  if (receipt.status !== "success") throw new BurnSyncError("Transaction reverted on-chain", 400);

  const sinkLogs = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs }).filter((l) => {
    const to = l.args.to.toLowerCase();
    return (to === zeroAddress || to === DEAD_ADDRESS) && l.args.value > 0n;
  });
  if (sinkLogs.length === 0) return [];

  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  const stored = [];

  for (const log of sinkLogs) {
    const token = log.address.toLowerCase() as `0x${string}`;
    await ensureTokenMetadata(client, chainId, token);
    // Supply as of the burn's block; falls back to latest when the node has no history.
    const totalSupplyAfter = await client
      .readContract({ address: token, abi: erc20Abi, functionName: "totalSupply", blockNumber: receipt.blockNumber })
      .catch(() => client.readContract({ address: token, abi: erc20Abi, functionName: "totalSupply" }))
      .catch(() => null);

    const row = {
      chainId,
      txHash: receipt.transactionHash.toLowerCase(),
      logIndex: log.logIndex,
      token,
      burner: log.args.from.toLowerCase(),
      mode: log.args.to.toLowerCase() === zeroAddress ? "burn" : "dead",
      amount: log.args.value.toString(),
      totalSupplyAfter: totalSupplyAfter === null ? null : totalSupplyAfter.toString(),
      blockNumber: receipt.blockNumber,
      timestamp: block.timestamp,
    };
    await db.insert(burns).values(row).onConflictDoNothing();
    stored.push({ token, logIndex: log.logIndex, mode: row.mode, amount: row.amount });
  }
  return stored;
}

export class BurnSyncError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
