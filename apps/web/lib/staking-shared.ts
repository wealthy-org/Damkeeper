export const DAM_TOKEN_ADDRESS = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4" as const;

export const DEFAULT_DAM_STAKING_POOL = (
  process.env.NEXT_PUBLIC_DAM_STAKING_POOL_ADDRESS ?? "0x7a63503D0c99A77F9e599b7D63C6fAee7A79a28e"
).toLowerCase() as `0x${string}`;

export const DEFAULT_STAKING_FACTORY = (
  process.env.NEXT_PUBLIC_STAKING_FACTORY_ADDRESS ?? "0x89C54e867bF140e6AcEFA39fF78553531F0a498D"
).toLowerCase() as `0x${string}`;

export interface StakingPoolView {
  chainId: number;
  poolAddress: string;
  stakingToken: string;
  stakingSymbol: string;
  stakingName: string;
  stakingDecimals: number;
  rewardToken: string;
  rewardSymbol: string;
  rewardName: string;
  rewardDecimals: number;
  creator: string;
  lockDuration: string; // in seconds
  name: string;
  totalStaked: string;
  rewardRate: string;
  periodFinish: string;
  apr: number; // estimated annual percentage yield / rate
  isOfficial: boolean;
  createdAt?: string;
  txHash?: string | null;
}

export function formatLockPolicy(lockDurationSeconds: string | bigint | number): string {
  const sec = BigInt(lockDurationSeconds);
  if (sec === 0n) return "Flexible (Unstake anytime)";
  const days = Number(sec / 86400n);
  if (days >= 30) {
    const months = Math.round(days / 30);
    return `${months} month${months > 1 ? "s" : ""} lock`;
  }
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} lock`;
  const hours = Number(sec / 3600n);
  if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} lock`;
  const mins = Number(sec / 60n);
  return `${mins} min${mins > 1 ? "s" : ""} lock`;
}

export function calculateApr(
  totalStaked: bigint,
  rewardRate: bigint,
  isOfficial = false
): number {
  if (totalStaked <= 0n) {
    return isOfficial ? 28.4 : 0;
  }
  // rewardRate is in tokens per second
  const SECONDS_PER_YEAR = 31_536_000n;
  const annualRewards = rewardRate * SECONDS_PER_YEAR;
  if (annualRewards <= 0n) {
    return isOfficial ? 28.4 : 0;
  }
  // APR % = (annualRewards / totalStaked) * 100
  // Scaled by 10000 for 2 decimals precision
  const scaled = (annualRewards * 10_000n) / totalStaked;
  const pct = Number(scaled) / 100;
  return Math.min(Math.max(pct, 0.01), 999.9);
}
