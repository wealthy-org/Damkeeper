import { db } from "@/db/client";
import { positions, positionEvents, chainCheckpoints } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { serializePosition } from "@/lib/serialize";

export async function GET(
  _request: Request,
  { params }: { params: { chainId: string; manager: string; id: string } }
) {
  const chainId = Number(params.chainId);
  const manager = params.manager.toLowerCase();
  const positionId = BigInt(params.id);

  const [position] = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.chainId, chainId),
        eq(positions.managerAddress, manager),
        eq(positions.positionId, positionId)
      )
    )
    .limit(1);

  if (!position) {
    return Response.json({ error: "Position not found" }, { status: 404 });
  }

  const events = await db
    .select()
    .from(positionEvents)
    .where(
      and(
        eq(positionEvents.chainId, chainId),
        eq(positionEvents.managerAddress, manager),
        eq(positionEvents.positionId, positionId),
        eq(positionEvents.canonical, true)
      )
    );

  const [checkpoint] = await db
    .select()
    .from(chainCheckpoints)
    .where(and(eq(chainCheckpoints.chainId, chainId), eq(chainCheckpoints.managerAddress, manager)))
    .limit(1);

  return Response.json({
    position: serializePosition(position),
    events: events.map((e) => ({
      blockNumber: e.blockNumber.toString(),
      txHash: e.txHash,
      logIndex: e.logIndex,
      eventName: e.eventName,
      payload: JSON.parse(e.payload),
    })),
    asOfBlock: checkpoint?.lastBlock.toString() ?? null,
    asOfBlockHash: checkpoint?.lastBlockHash ?? null,
    indexedAt: checkpoint?.updatedAt ?? null,
    confirmationTier: checkpoint?.confirmationTier ?? null,
    stale: !checkpoint,
  });
}
