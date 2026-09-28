import { db } from "@/db/client";
import { chainCheckpoints } from "@/db/schema";

export async function GET() {
  try {
    const checkpoints = await db.select().from(chainCheckpoints);
    return Response.json({
      status: "ok",
      indexer: checkpoints.map((c) => ({
        chainId: c.chainId,
        manager: c.managerAddress,
        lastBlock: c.lastBlock.toString(),
        confirmationTier: c.confirmationTier,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) {
    return Response.json({ status: "degraded", error: String(err) }, { status: 503 });
  }
}
