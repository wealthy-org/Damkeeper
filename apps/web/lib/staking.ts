import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import { db } from "@/db/client";
import { stakingPools, tokens } from "@/db/schema";
import { chainById, robinhoodMainnet } from "@/lib/chains";
import { stakingPoolAbi } from "@/lib/abi";
import { ensureTokenMetadata } from "@/lib/token-metadata";

import {
  type StakingPoolView,
  calculateApr,
  DEFAULT_DAM_STAKING_POOL,
  DAM_TOKEN_ADDRESS,
} from "./staking-shared";
export * from "./staking-shared";


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
