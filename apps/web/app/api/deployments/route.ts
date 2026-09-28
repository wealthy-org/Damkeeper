import { db } from "@/db/client";
import { deployments } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/deployments?chainId=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");

  const rows = await db
    .select()
    .from(deployments)
    .where(chainId ? eq(deployments.chainId, Number(chainId)) : undefined);

  return Response.json({
    deployments: rows.map((d) => ({
      chainId: d.chainId,
      managerAddress: d.managerAddress,
      kind: d.kind,
      version: d.version,
      deployTxHash: d.deployTxHash,
      deployBlock: d.deployBlock.toString(),
      abiHash: d.abiHash,
      sourceCommit: d.sourceCommit,
      verifiedSourceUrl: d.verifiedSourceUrl,
      admin: d.admin,
    })),
  });
}
