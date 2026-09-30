import { claimableAmount, lockStatus, vestedAmount, vestingStatus } from "@damkeeper/domain/vesting";
import { formatTokenAmount } from "@/lib/amounts";

/** A position as the UI and share card see it. All amounts/timestamps are strings (JSON-safe BigInts). */
export interface PositionView {
  chainId: number;
  manager: string;
  positionId: string;
  kind: "lock" | "vesting";
  token: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  tokenDecimals: number | null;
  creator: string;
  beneficiary: string;
  amount: string;
  claimedAmount: string;
  createdAt: string;
  unlockTime: string | null;
  startTime: string | null;
  cliffTime: string | null;
  endTime: string | null;
  withdrawn: boolean;
  /** Offchain, creator-signed label. Never part of the onchain proof. */
  label: string | null;
  /** "chain" when read straight from the contract because the indexer hasn't caught up. */
  source: "indexed" | "chain";
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function tokenLabel(p: PositionView) {
  return p.tokenSymbol ?? shortAddress(p.token);
}

export function decimalsOf(p: PositionView) {
  return p.tokenDecimals ?? 18;
}

export function formatAmount(p: PositionView, raw: string | bigint = p.amount, maxFraction = 4) {
  return formatTokenAmount(BigInt(raw), decimalsOf(p), maxFraction);
}

function vestingTerms(p: PositionView) {
  return {
    totalAmount: BigInt(p.amount),
    startTime: BigInt(p.startTime ?? 0),
    cliffTime: BigInt(p.cliffTime ?? 0),
    endTime: BigInt(p.endTime ?? 0),
    claimedAmount: BigInt(p.claimedAmount),
  };
}

export type StatusKey = "locked" | "withdrawable" | "withdrawn" | "scheduled" | "cliff_pending" | "vesting" | "fully_vested" | "fully_claimed";

export const STATUS_LABEL: Record<StatusKey, string> = {
  locked: "Locked",
  withdrawable: "Withdrawable",
  withdrawn: "Withdrawn",
  scheduled: "Scheduled",
  cliff_pending: "Cliff pending",
  vesting: "Vesting",
  fully_vested: "Fully vested",
  fully_claimed: "Fully claimed",
};

export function statusOf(p: PositionView, nowSeconds = BigInt(Math.floor(Date.now() / 1000))): StatusKey {
  if (p.kind === "lock") return lockStatus(BigInt(p.unlockTime ?? 0), p.withdrawn, nowSeconds);
  return vestingStatus(vestingTerms(p), nowSeconds);
}

export function progressOf(p: PositionView, nowSeconds = BigInt(Math.floor(Date.now() / 1000))) {
  const total = BigInt(p.amount);
  if (total === 0n) return 0;
  if (p.kind === "lock") {
    const created = BigInt(p.createdAt);
    const unlock = BigInt(p.unlockTime ?? 0);
    if (p.withdrawn || nowSeconds >= unlock) return 100;
    if (unlock <= created) return 0;
    return Number(((nowSeconds - created) * 100n) / (unlock - created));
  }
  return Number((vestedAmount(vestingTerms(p), nowSeconds) * 100n) / total);
}

export function claimableOf(p: PositionView, nowSeconds = BigInt(Math.floor(Date.now() / 1000))) {
  if (p.kind === "lock") return statusOf(p, nowSeconds) === "withdrawable" ? BigInt(p.amount) : 0n;
  return claimableAmount(vestingTerms(p), nowSeconds);
}

/** When the position fully releases: unlock time for a lock, end time for vesting. */
export function releaseAt(p: PositionView) {
  const s = p.kind === "lock" ? p.unlockTime : p.endTime;
  return s ? new Date(Number(s) * 1000) : null;
}

export function durationLabel(p: PositionView) {
  const from = Number(p.kind === "lock" ? p.createdAt : p.startTime ?? p.createdAt);
  const to = Number(p.kind === "lock" ? p.unlockTime ?? 0 : p.endTime ?? 0);
  const secs = Math.max(0, to - from);
  const day = 86_400;
  if (secs < 3600) return `${Math.max(1, Math.round(secs / 60))} min`;
  if (secs < day) return `${Math.round(secs / 3600)} hours`;
  if (secs < 60 * day) return `${Math.round(secs / day)} days`;
  if (secs < 730 * day) return `${Math.round(secs / (30.44 * day))} months`;
  return `${Math.round((secs / (365.25 * day)) * 10) / 10} years`;
}

export function proofPath(p: Pick<PositionView, "chainId" | "manager" | "positionId">) {
  return `/positions/${p.chainId}/${p.manager}/${p.positionId}`;
}
