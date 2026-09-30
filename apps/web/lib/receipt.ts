import { decodeEventLog, type Abi, type TransactionReceipt } from "viem";

/**
 * Pulls the new position ID out of the create transaction's receipt, from the
 * right manager's event only (brief.md 10, create-lock step 8) — so the proof
 * page can be linked before the indexer catches up.
 */
export function positionIdFromReceipt(receipt: TransactionReceipt, manager: string, abi: Abi, eventName: string) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== manager.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi, data: log.data, topics: log.topics });
      if (ev.eventName === eventName) return (ev.args as unknown as { id: bigint }).id.toString();
    } catch {
      // Not one of this ABI's events.
    }
  }
  return null;
}
