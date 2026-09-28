import { db } from "@/db/client";
import { positions, chainCheckpoints } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { serializePosition } from "@/lib/serialize";

// GET /api/positions?chainId=&wallet=&role=creator|beneficiary&type=&cursor=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const wallet = searchParams.get("wallet")?.toLowerCase();
  const role = searchParams.get("role"); // creator | beneficiary
  const type = searchParams.get("type"); // lock | vesting

  const conditions = [];
  if (chainId) conditions.push(eq(positions.chainId, Number(chainId)));
  if (type) conditions.push(eq(positions.kind, type));
  if (wallet) {
    if (role === "creator") conditions.push(eq(positions.creator, wallet));
    else if (role === "beneficiary") conditions.push(eq(positions.beneficiary, wallet));
    else conditions.push(or(eq(positions.creator, wallet), eq(positions.beneficiary, wallet)));
  }

  const rows = await db
    .select()
    .from(positions)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(50);

  const checkpoint = chainId
    ? await db
        .select()
        .from(chainCheckpoints)
        .where(eq(chainCheckpoints.chainId, Number(chainId)))
        .limit(1)
    : [];

  const asOf = checkpoint[0];

  return Response.json({
    positions: rows.map(serializePosition),
    asOfBlock: asOf ? asOf.lastBlock.toString() : null,
    asOfBlockHash: asOf?.lastBlockHash ?? null,
    indexedAt: asOf?.updatedAt ?? null,
    confirmationTier: asOf?.confirmationTier ?? null,
    stale: !asOf,
  });
}
