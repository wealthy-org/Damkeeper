import { db } from "@/db/client";
import { stakingPools } from "@/db/schema";
import { robinhoodMainnet, chainById } from "@/lib/chains";
import { createPublicClient, http } from "viem";
import { stakingPoolAbi } from "@/lib/abi";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const chainId = Number(body.chainId ?? robinhoodMainnet.id);
  const poolAddress = (body.poolAddress as string)?.toLowerCase();
  const txHash = body.txHash as string | undefined;

  if (!poolAddress || !/^0x[0-9a-fA-F]{40}$/.test(poolAddress)) {
    return Response.json({ error: "Invalid pool address" }, { status: 400 });
  }

  const chain = chainById(chainId);
  if (!chain) {
    return Response.json({ error: "Unsupported chain" }, { status: 400 });
  }

  try {
    const client = createPublicClient({ chain, transport: http() });

    // Read details from on-chain pool contract directly to ensure authenticity
    const [stakingToken, rewardToken, creator, lockDuration, poolName] = await Promise.all([
      client.readContract({
        address: poolAddress as `0x${string}`,
        abi: stakingPoolAbi,
        functionName: "stakingToken",
      }),
      client.readContract({
        address: poolAddress as `0x${string}`,
        abi: stakingPoolAbi,
        functionName: "rewardToken",
      }),
      client.readContract({
        address: poolAddress as `0x${string}`,
        abi: stakingPoolAbi,
        functionName: "creator",
      }),
      client.readContract({
        address: poolAddress as `0x${string}`,
        abi: stakingPoolAbi,
        functionName: "lockDuration",
      }),
      client.readContract({
        address: poolAddress as `0x${string}`,
        abi: stakingPoolAbi,
        functionName: "poolName",
      }),
    ]);

    const block = await client.getBlock({ blockTag: "latest" });

    await db.insert(stakingPools).values({
      chainId,
      poolAddress,
      stakingToken: stakingToken.toLowerCase(),
      rewardToken: rewardToken.toLowerCase(),
      creator: creator.toLowerCase(),
      lockDuration: BigInt(lockDuration.toString()),
      name: poolName || body.name || "Community Pool",
      createdAt: block.timestamp,
      txHash: txHash || null,
    }).onConflictDoNothing();

    return Response.json({
      ok: true,
      pool: {
        poolAddress,
        stakingToken,
        rewardToken,
        creator,
        lockDuration: lockDuration.toString(),
        name: poolName,
      },
    });
  } catch (err) {
    console.error("Error in /api/staking/sync:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to sync staking pool" },
      { status: 500 }
    );
  }
}
