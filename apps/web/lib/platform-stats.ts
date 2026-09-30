import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { positions, tokenPolicies, chainCheckpoints } from "@/db/schema";

// Counts only — no USD value. Positions can hold different tokens with different
// decimals and there's no price source, so a "total value locked" figure would be
// made up (brief.md 10: logos/tickers/professional-looking numbers are not proof).
export async function getPlatformStats() {
  const [[counts], [policies], [checkpoint]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        activeLocks: sql<number>`(count(*) filter (where ${positions.kind} = 'lock' and not ${positions.withdrawn}))::int`,
        activeVesting: sql<number>`(count(*) filter (where ${positions.kind} = 'vesting' and ${positions.claimedAmount} < ${positions.amount}))::int`,
        settled: sql<number>`(count(*) filter (where ${positions.withdrawn} or (${positions.kind} = 'vesting' and ${positions.claimedAmount} >= ${positions.amount})))::int`,
        tokens: sql<number>`count(distinct ${positions.token})::int`,
      })
      .from(positions),
    db
      .select({ enabled: sql<number>`count(distinct ${tokenPolicies.token}) filter (where ${tokenPolicies.enabled})` })
      .from(tokenPolicies),
    db
      .select({
        lastBlock: sql<string | null>`max(${chainCheckpoints.lastBlock})::text`,
        updatedAt: sql<string | null>`max(${chainCheckpoints.updatedAt})::text`,
      })
      .from(chainCheckpoints),
  ]);

  return {
    total: counts?.total ?? 0,
    activeLocks: counts?.activeLocks ?? 0,
    activeVesting: counts?.activeVesting ?? 0,
    settled: counts?.settled ?? 0,
    tokens: counts?.tokens ?? 0,
    enabledTokens: Number(policies?.enabled ?? 0),
    lastBlock: checkpoint?.lastBlock ?? null,
    indexedAt: checkpoint?.updatedAt ?? null,
  };
}
