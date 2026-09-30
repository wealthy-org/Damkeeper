import { isAddress, isHex, recoverMessageAddress } from "viem";
import { db } from "@/db/client";
import { positionLabels } from "@/db/schema";
import { getPosition } from "@/lib/positions-query";
import { cleanLabel, labelMessage } from "@/lib/label-message";

// POST /api/labels — set the offchain label for a position. Only the position's
// onchain creator can set it, proven by signing labelMessage(); otherwise anyone
// could put a misleading name on someone else's lock.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const chainId = Number(body?.chainId);
  const manager = String(body?.manager ?? "");
  const positionId = String(body?.positionId ?? "");
  const signature = String(body?.signature ?? "");
  const label = cleanLabel(String(body?.label ?? ""));

  if (!chainId || !isAddress(manager) || !/^\d{1,18}$/.test(positionId) || !isHex(signature) || !label) {
    return Response.json({ error: "chainId, manager, positionId, label and signature are required." }, { status: 400 });
  }

  const position = await getPosition(chainId, manager, BigInt(positionId));
  if (!position) return Response.json({ error: "Position not found." }, { status: 404 });

  let signer: string;
  try {
    signer = await recoverMessageAddress({ message: labelMessage(chainId, manager, positionId, label), signature });
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }
  if (signer.toLowerCase() !== position.creator) {
    return Response.json({ error: "Only the wallet that created this position can label it." }, { status: 403 });
  }

  await db
    .insert(positionLabels)
    .values({ chainId, managerAddress: manager.toLowerCase(), positionId: BigInt(positionId), label, setBy: signer.toLowerCase() })
    .onConflictDoUpdate({
      target: [positionLabels.chainId, positionLabels.managerAddress, positionLabels.positionId],
      set: { label, setBy: signer.toLowerCase(), updatedAt: new Date() },
    });

  return Response.json({ label });
}
