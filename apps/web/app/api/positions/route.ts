import { db } from "@/db/client";
import { chainCheckpoints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listPositions } from "@/lib/positions-query";

// GET /api/positions?chainId=&wallet=&role=creator|beneficiary&type=lock|vesting&token=&q=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = Number(searchParams.get("chainId")) || undefined;
  const wallet = searchParams.get("wallet") ?? undefined;
  const role = searchParams.get("role");
  const type = searchParams.get("type");
  const token = searchParams.get("token") ?? undefined;
  const q = searchParams.get("q")?.trim().slice(0, 66) || undefined;

  const rows = await listPositions({
    chainId,
    wallet,
    role: role === "creator" || role === "beneficiary" ? role : undefined,
    kind: type === "lock" || type === "vesting" ? type : undefined,
    token,
    q,
    limit: 100,
  });

  const [asOf] = chainId
    ? await db.select().from(chainCheckpoints).where(eq(chainCheckpoints.chainId, chainId)).limit(1)
    : [];

  return Response.json({
    positions: rows,
    asOfBlock: asOf ? asOf.lastBlock.toString() : null,
    asOfBlockHash: asOf?.lastBlockHash ?? null,
    indexedAt: asOf?.updatedAt ?? null,
    confirmationTier: asOf?.confirmationTier ?? null,
    stale: !asOf,
  });
}
