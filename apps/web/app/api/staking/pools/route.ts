import { listStakingPools } from "@/lib/staking";
import { robinhoodMainnet } from "@/lib/chains";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = Number(searchParams.get("chainId") ?? robinhoodMainnet.id);
  const q = searchParams.get("q") ?? undefined;

  try {
    const pools = await listStakingPools(chainId, q);
    return Response.json({ ok: true, pools });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to list staking pools" },
      { status: 500 }
    );
  }
}
