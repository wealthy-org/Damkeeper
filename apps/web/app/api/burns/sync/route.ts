import { robinhoodMainnet } from "@/lib/chains";
import { BurnSyncError, ingestBurnTx } from "@/lib/burns";

// POST /api/burns/sync
// On-demand indexing for burns: the burn form posts the tx hash once it's mined.
// Only Transfer logs into 0x0 or 0x…dEaD are stored, so any tx hash is safe to submit.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const txHash = body?.txHash as `0x${string}` | undefined;
  const chainId = Number(body?.chainId ?? robinhoodMainnet.id);

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return Response.json({ error: "Invalid transaction hash" }, { status: 400 });
  }

  try {
    const burns = await ingestBurnTx(chainId, txHash);
    return Response.json({ ok: true, burns });
  } catch (err) {
    if (err instanceof BurnSyncError) return Response.json({ error: err.message }, { status: err.status });
    console.error("Error in /api/burns/sync:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 500 });
  }
}
