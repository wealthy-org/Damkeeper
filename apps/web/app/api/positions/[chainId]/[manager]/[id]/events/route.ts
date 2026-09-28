import { db } from "@/db/client";
import { positionEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: { chainId: string; manager: string; id: string } }
) {
  const chainId = Number(params.chainId);
  const manager = params.manager.toLowerCase();
  const positionId = BigInt(params.id);

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

  return Response.json({
    events: events.map((e) => ({
      blockNumber: e.blockNumber.toString(),
      blockHash: e.blockHash,
      txHash: e.txHash,
      logIndex: e.logIndex,
      eventName: e.eventName,
      payload: JSON.parse(e.payload),
    })),
  });
}
