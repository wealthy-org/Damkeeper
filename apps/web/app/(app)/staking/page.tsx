import type { Metadata } from "next";
import { listStakingPools } from "@/lib/staking";
import { StakingDashboard } from "./staking-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staking Pools",
  description:
    "Stake $DAM or any Robinhood Chain token to earn continuous yields with mathematical O(1) reward distribution.",
};

export default async function StakingPage({
  searchParams,
}: {
  searchParams: { pool?: string };
}) {
  const pools = await listStakingPools();

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          Yield & Staking · Robinhood Chain Mainnet
        </div>
        <h1>Staking Pools</h1>
        <p className="page-lede">
          Earn continuous, mathematically verified yields on Robinhood Chain. Non-custodial,
          permissionless, with instant harvest and flexible or timelocked policies.
        </p>
      </div>

      <StakingDashboard pools={pools} initialPoolAddress={searchParams.pool} />
    </main>
  );
}
