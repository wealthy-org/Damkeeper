import { positions } from "@/db/schema";

export function serializePosition(p: typeof positions.$inferSelect) {
  return {
    chainId: p.chainId,
    manager: p.managerAddress,
    positionId: p.positionId.toString(),
    kind: p.kind,
    token: p.token,
    creator: p.creator,
    beneficiary: p.beneficiary,
    amount: p.amount,
    claimedAmount: p.claimedAmount,
    createdAt: p.createdAt.toString(),
    unlockTime: p.unlockTime?.toString() ?? null,
    startTime: p.startTime?.toString() ?? null,
    cliffTime: p.cliffTime?.toString() ?? null,
    endTime: p.endTime?.toString() ?? null,
    withdrawn: p.withdrawn,
  };
}
