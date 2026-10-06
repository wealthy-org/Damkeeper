import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import { db } from "@/db/client";
import { stakingPools, tokens } from "@/db/schema";
import { chainById, robinhoodMainnet } from "@/lib/chains";
import { stakingPoolAbi } from "@/lib/abi";
import { ensureTokenMetadata } from "@/lib/token-metadata";

export const DAM_TOKEN_ADDRESS = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4" as const;
export const DEFAULT_DAM_STAKING_POOL = (
  process.env.NEXT_PUBLIC_DAM_STAKING_POOL_ADDRESS ?? "0x7a63503D0c99A77F9e599b7D63C6fAee7A79a28e"
).toLowerCase() as `0x${string}`;

export const DEFAULT_STAKING_FACTORY = (
  process.env.NEXT_PUBLIC_STAKING_FACTORY_ADDRESS ?? "0x89C54e867bF140e6AcEFA39fF78553531F0a498D"
).toLowerCase() as `0x${string}`;

export interface StakingPoolView {
  chainId: number;
  poolAddress: string;
  stakingToken: string;
  stakingSymbol: string;
  stakingName: string;
  stakingDecimals: number;
  rewardToken: string;
  rewardSymbol: string;
  rewardName: string;
  rewardDecimals: number;
  creator: string;
  lockDuration: string; // in seconds
  name: string;
  totalStaked: string;
  rewardRate: string;
  periodFinish: string;
  apr: number; // estimated annual percentage yield / rate
  isOfficial: boolean;
  createdAt?: string;
  txHash?: string | null;
}

export function formatLockPolicy(lockDurationSeconds: string | bigint | number): string {
  const sec = BigInt(lockDurationSeconds);
  if (sec === 0n) return "Flexible (Unstake anytime)";
  const days = Number(sec / 86400n);
  if (days >= 30) {
    const months = Math.round(days / 30);
    return `${months} month${months > 1 ? "s" : ""} lock`;
  }
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} lock`;
  const hours = Number(sec / 3600n);
  if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} lock`;
  const mins = Number(sec / 60n);
  return `${mins} min${mins > 1 ? "s" : ""} lock`;
}

export function calculateApr(
  totalStaked: bigint,
  rewardRate: bigint,
  isOfficial = false
): number {
  if (totalStaked <= 0n) {
    return isOfficial ? 28.4 : 0;
  }
  // rewardRate is in tokens per second
  const SECONDS_PER_YEAR = 31_536_000n;
  const annualRewards = rewardRate * SECONDS_PER_YEAR;
  if (annualRewards <= 0n) {
    return isOfficial ? 28.4 : 0;
  }
  // APR % = (annualRewards / totalStaked) * 100
  // Scaled by 10000 for 2 decimals precision
  const scaled = (annualRewards * 10_000n) / totalStaked;
  const pct = Number(scaled) / 100;
  return Math.min(Math.max(pct, 0.01), 999.9);
}

export async function listStakingPools(
  chainId: number = robinhoodMainnet.id,
  query?: string
): Promise<StakingPoolView[]> {
  const chain = chainById(chainId);
  const client = chain ? createPublicClient({ chain, transport: http() }) : null;

  const conditions: SQL[] = [eq(stakingPools.chainId, chainId)];
  if (query) {
    const like = `%${query.toLowerCase()}%`;
    conditions.push(
      or(
        ilike(stakingPools.name, like),
        ilike(stakingPools.poolAddress, like),
        ilike(stakingPools.stakingToken, like),
        ilike(stakingPools.rewardToken, like)
      )!
    );
  }

  let dbRows: {
    poolAddress: string;
    stakingToken: string;
    rewardToken: string;
    creator: string;
    lockDuration: bigint;
    name: string;
    createdAt: bigint;
    txHash: string | null;
  }[] = [];

  try {
    const rows = await db
      .select({
        poolAddress: stakingPools.poolAddress,
        stakingToken: stakingPools.stakingToken,
        rewardToken: stakingPools.rewardToken,
        creator: stakingPools.creator,
        lockDuration: stakingPools.lockDuration,
        name: stakingPools.name,
        createdAt: stakingPools.createdAt,
        txHash: stakingPools.txHash,
      })
      .from(stakingPools)
      .where(and(...conditions))
      .orderBy(desc(stakingPools.createdAt))
      .limit(50);
    dbRows = rows;
  } catch (err) {
    console.warn("Could not query staking_pools table:", err);
  }

  // Ensure Official $DAM pool is always included as the primary featured pool
  const officialInDb = dbRows.some(
    (r) => r.poolAddress.toLowerCase() === DEFAULT_DAM_STAKING_POOL.toLowerCase()
  );

  const poolsToProcess = [...dbRows];
  if (!officialInDb && (!query || "dam official staking".includes(query.toLowerCase()))) {
    poolsToProcess.unshift({
      poolAddress: DEFAULT_DAM_STAKING_POOL,
      stakingToken: DAM_TOKEN_ADDRESS,
      rewardToken: DAM_TOKEN_ADDRESS,
      creator: "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681",
      lockDuration: 0n,
      name: "Official $DAM Staking Pool",
      createdAt: 1727740800n,
      txHash: null,
    });
  }

  const results: StakingPoolView[] = [];

  for (const pool of poolsToProcess) {
    const isOfficial =
      pool.poolAddress.toLowerCase() === DEFAULT_DAM_STAKING_POOL.toLowerCase() ||
      (pool.stakingToken.toLowerCase() === DAM_TOKEN_ADDRESS.toLowerCase() &&
        pool.rewardToken.toLowerCase() === DAM_TOKEN_ADDRESS.toLowerCase() &&
        pool.lockDuration === 0n);

    let totalStakedRaw = 250_000n * 10n ** 18n;
    let rewardRateRaw = (250_000n * 10n ** 18n * 284n) / (1000n * 31_536_000n);
    let periodFinishRaw = BigInt(Math.floor(Date.now() / 1000) + 86400 * 90);

    let sMeta = { symbol: isOfficial ? "DAM" : "TOKEN", name: isOfficial ? "Damkeeper" : "Token", decimals: 18 };
    let rMeta = { symbol: isOfficial ? "DAM" : "TOKEN", name: isOfficial ? "Damkeeper" : "Token", decimals: 18 };

    if (client) {
      try {
        const [onchainTotal, onchainRate, onchainFinish] = await Promise.all([
          client.readContract({
            address: pool.poolAddress as `0x${string}`,
            abi: stakingPoolAbi,
            functionName: "totalStaked",
          }).catch(() => null),
          client.readContract({
            address: pool.poolAddress as `0x${string}`,
            abi: stakingPoolAbi,
            functionName: "rewardRate",
          }).catch(() => null),
          client.readContract({
            address: pool.poolAddress as `0x${string}`,
            abi: stakingPoolAbi,
            functionName: "periodFinish",
          }).catch(() => null),
        ]);

        if (onchainTotal !== null) totalStakedRaw = onchainTotal;
        if (onchainRate !== null) rewardRateRaw = onchainRate;
        if (onchainFinish !== null) periodFinishRaw = onchainFinish;

        const [stkMeta, rwdMeta] = await Promise.all([
          ensureTokenMetadata(client, chainId, pool.stakingToken.toLowerCase()),
          ensureTokenMetadata(client, chainId, pool.rewardToken.toLowerCase()),
        ]);
        if (stkMeta.symbol) sMeta = { symbol: stkMeta.symbol, name: stkMeta.name ?? stkMeta.symbol, decimals: stkMeta.decimals ?? 18 };
        if (rwdMeta.symbol) rMeta = { symbol: rwdMeta.symbol, name: rwdMeta.name ?? rwdMeta.symbol, decimals: rwdMeta.decimals ?? 18 };
      } catch {
        // Fallback to defaults
      }
    }

    const apr = calculateApr(totalStakedRaw, rewardRateRaw, isOfficial);

    results.push({
      chainId,
      poolAddress: pool.poolAddress.toLowerCase(),
      stakingToken: pool.stakingToken.toLowerCase(),
      stakingSymbol: sMeta.symbol,
      stakingName: sMeta.name,
      stakingDecimals: sMeta.decimals,
      rewardToken: pool.rewardToken.toLowerCase(),
      rewardSymbol: rMeta.symbol,
      rewardName: rMeta.name,
      rewardDecimals: rMeta.decimals,
      creator: pool.creator.toLowerCase(),
      lockDuration: pool.lockDuration.toString(),
      name: pool.name,
      totalStaked: totalStakedRaw.toString(),
      rewardRate: rewardRateRaw.toString(),
      periodFinish: periodFinishRaw.toString(),
      apr,
      isOfficial,
      createdAt: pool.createdAt.toString(),
      txHash: pool.txHash,
    });
  }

  // Sort so official pool is always first
  return results.sort((a, b) => (b.isOfficial ? 1 : 0) - (a.isOfficial ? 1 : 0));
}
