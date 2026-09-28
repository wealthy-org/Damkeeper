// Vesting formula per brief.md section 8.5. Must stay identical to the Solidity
// implementation in packages/contracts/src/DamkeeperVestingManager.sol — this is the
// frontend/API mirror used for previews before a position exists onchain.

export interface VestingTerms {
  totalAmount: bigint; // A
  startTime: bigint; // S
  cliffTime: bigint; // C, 0 = no cliff
  endTime: bigint; // E
  claimedAmount: bigint; // R
}

export function vestedAmount(terms: VestingTerms, timestamp: bigint): bigint {
  const { totalAmount, startTime, cliffTime, endTime } = terms;
  if (timestamp < startTime) return 0n;
  if (cliffTime !== 0n && timestamp < cliffTime) return 0n;
  if (timestamp >= endTime) return totalAmount;
  return (totalAmount * (timestamp - startTime)) / (endTime - startTime);
}

export function claimableAmount(terms: VestingTerms, timestamp: bigint): bigint {
  return vestedAmount(terms, timestamp) - terms.claimedAmount;
}

export function unvestedAmount(terms: VestingTerms, timestamp: bigint): bigint {
  return terms.totalAmount - vestedAmount(terms, timestamp);
}

export function remainingInEscrow(terms: VestingTerms): bigint {
  return terms.totalAmount - terms.claimedAmount;
}

export type VestingStatus = "scheduled" | "cliff_pending" | "vesting" | "fully_vested" | "fully_claimed";

export function vestingStatus(terms: VestingTerms, timestamp: bigint): VestingStatus {
  if (terms.claimedAmount >= terms.totalAmount) return "fully_claimed";
  if (timestamp >= terms.endTime) return "fully_vested";
  if (timestamp < terms.startTime) return "scheduled";
  if (terms.cliffTime !== 0n && timestamp < terms.cliffTime) return "cliff_pending";
  return "vesting";
}

export type LockStatus = "locked" | "withdrawable" | "withdrawn";

export function lockStatus(unlockTime: bigint, withdrawn: boolean, timestamp: bigint): LockStatus {
  if (withdrawn) return "withdrawn";
  return timestamp >= unlockTime ? "withdrawable" : "locked";
}
