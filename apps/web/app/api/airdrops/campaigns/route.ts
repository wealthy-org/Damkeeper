import { NextResponse } from "next/server";
import { listAirdropCampaigns } from "@/lib/airdrops";
import { robinhoodMainnet } from "@/lib/chains";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chainId = parseInt(searchParams.get("chainId") || `${robinhoodMainnet.id}`, 10);
    const userAddress = searchParams.get("user") || undefined;
    const tab = (searchParams.get("tab") as any) || "claimable";
    const query = searchParams.get("q") || undefined;

    const campaigns = await listAirdropCampaigns({
      chainId,
      userAddress,
      tab,
      query,
    });

    return NextResponse.json({ ok: true, campaigns });
  } catch (err: any) {
    console.error("Error in /api/airdrops/campaigns:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to list airdrops" }, { status: 500 });
  }
}
