import { db } from "@/db/client";
import { tokens, tokenPolicies } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// GET /api/tokens?chainId=&manager=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const manager = searchParams.get("manager")?.toLowerCase();

  if (!chainId) {
    return Response.json({ error: "chainId is required" }, { status: 400 });
  }

  const tokenRows = await db.select().from(tokens).where(eq(tokens.chainId, Number(chainId)));

  const policyRows = manager
    ? await db
        .select()
        .from(tokenPolicies)
        .where(
          and(eq(tokenPolicies.chainId, Number(chainId)), eq(tokenPolicies.managerAddress, manager))
        )
    : [];

  const policyByToken = new Map(policyRows.map((p) => [p.token, p]));

  return Response.json({
    tokens: tokenRows.map((t) => ({
      chainId: t.chainId,
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      supportNote: t.supportNote,
      policy: policyByToken.has(t.address)
        ? {
            enabled: policyByToken.get(t.address)!.enabled,
            liabilityCap: policyByToken.get(t.address)!.liabilityCap,
          }
        : null,
    })),
  });
}
