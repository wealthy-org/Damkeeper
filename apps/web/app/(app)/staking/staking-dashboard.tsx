"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAccount, useConnect, usePublicClient } from "wagmi";
import { parseAbi, formatUnits, erc20Abi } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import { stakingPoolAbi } from "@/lib/abi";
import {
  formatLockPolicy,
  type StakingPoolView,
  DEFAULT_DAM_STAKING_POOL,
  DAM_TOKEN_ADDRESS,
} from "@/lib/staking";
import { formatTokenAmount, safeParseUnits } from "@/lib/amounts";
import { useTxFlow } from "@/lib/use-tx-flow";
import { useWrongNetwork } from "../wrong-network-banner";
import { CreatePoolModal } from "./create-pool-modal";

interface StakingDashboardProps {
  pools: StakingPoolView[];
  initialPoolAddress?: string;
}

export function StakingDashboard({ pools, initialPoolAddress }: StakingDashboardProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const wrongNetwork = useWrongNetwork();
  const publicClient = usePublicClient();
  const txFlow = useTxFlow();

  const [activePoolAddress, setActivePoolAddress] = useState<string>(
    initialPoolAddress?.toLowerCase() ??
      pools[0]?.poolAddress?.toLowerCase() ??
      DEFAULT_DAM_STAKING_POOL
  );

  const [activeTab, setActiveTab] = useState<"stake" | "unstake" | "claim">("stake");
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [unstakeAmount, setUnstakeAmount] = useState<string>("");

  // Live user balances
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>(0n);
  const [userAllowance, setUserAllowance] = useState<bigint>(0n);
  const [userStakedBalance, setUserStakedBalance] = useState<bigint>(0n);
  const [userEarnedRewards, setUserEarnedRewards] = useState<bigint>(0n);
  const [userStakeTime, setUserStakeTime] = useState<bigint>(0n);
  const [poolTotalStaked, setPoolTotalStaked] = useState<bigint>(0n);

  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<"all" | "flexible" | "locked">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const currentPool =
    pools.find((p) => p.poolAddress.toLowerCase() === activePoolAddress.toLowerCase()) ??
    pools[0];

  // Refresh on-chain balances
  const refreshBalances = async () => {
    if (!publicClient || !currentPool) return;

    try {
      // Pool total staked
      const total = await publicClient.readContract({
        address: currentPool.poolAddress as `0x${string}`,
        abi: stakingPoolAbi,
        functionName: "totalStaked",
      }).catch(() => null);
      if (total !== null) setPoolTotalStaked(total);

      if (address) {
        // User wallet balance of staking token
        const bal = await publicClient.readContract({
          address: currentPool.stakingToken as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }).catch(() => 0n);
        setUserTokenBalance(bal);

        // User allowance
        const allow = await publicClient.readContract({
          address: currentPool.stakingToken as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, currentPool.poolAddress as `0x${string}`],
        }).catch(() => 0n);
        setUserAllowance(allow);

        // User staked in pool
        const staked = await publicClient.readContract({
          address: currentPool.poolAddress as `0x${string}`,
          abi: stakingPoolAbi,
          functionName: "balanceOf",
          args: [address],
        }).catch(() => 0n);
        setUserStakedBalance(staked);

        // User earned rewards
        const earned = await publicClient.readContract({
          address: currentPool.poolAddress as `0x${string}`,
          abi: stakingPoolAbi,
          functionName: "earned",
          args: [address],
        }).catch(() => 0n);
        setUserEarnedRewards(earned);

        // User stake timestamp
        const sTime = await publicClient.readContract({
          address: currentPool.poolAddress as `0x${string}`,
          abi: stakingPoolAbi,
          functionName: "stakeTimestamp",
          args: [address],
        }).catch(() => 0n);
        setUserStakeTime(sTime);
      }
    } catch (err) {
      console.warn("Error refreshing staking pool data:", err);
    }
  };

  useEffect(() => {
    refreshBalances();
    // Live ticking polling for rewards every 4 seconds
    const timer = setInterval(refreshBalances, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, address, currentPool?.poolAddress]);

  if (!currentPool) {
    return <div>No pool available.</div>;
  }

  const sDecimals = currentPool.stakingDecimals;
  const rDecimals = currentPool.rewardDecimals;

  const parsedStake = safeParseUnits(stakeAmount, sDecimals) ?? 0n;
  const parsedUnstake = safeParseUnits(unstakeAmount, sDecimals) ?? 0n;

  const needsApproval = parsedStake > 0n && userAllowance < parsedStake;

  // Timelock check
  const lockDurationSec = BigInt(currentPool.lockDuration);
  const unlockTimestamp = userStakeTime > 0n && lockDurationSec > 0n ? userStakeTime + lockDurationSec : 0n;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const isLocked = unlockTimestamp > 0n && nowSec < unlockTimestamp;
  const remainingLockSec = isLocked ? Number(unlockTimestamp - nowSec) : 0;

  function formatTimeRemaining(sec: number) {
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hrs}h remaining`;
    if (hrs > 0) return `${hrs}h ${mins}m remaining`;
    return `${mins}m ${sec % 60}s remaining`;
  }

  // Quick percent helpers
  function setStakePct(pct: number) {
    if (userTokenBalance <= 0n) return;
    const val = (userTokenBalance * BigInt(pct)) / 100n;
    setStakeAmount(formatUnits(val, sDecimals));
  }

  function setUnstakePct(pct: number) {
    if (userStakedBalance <= 0n) return;
    const val = (userStakedBalance * BigInt(pct)) / 100n;
    setUnstakeAmount(formatUnits(val, sDecimals));
  }

  // Transactions
  async function handleApprove() {
    if (!address || parsedStake <= 0n) return;
    await txFlow.run({
      address: currentPool.stakingToken as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [currentPool.poolAddress as `0x${string}`, 2n ** 256n - 1n],
    });
    await refreshBalances();
  }

  async function handleStake() {
    if (!address || parsedStake <= 0n) return;
    const receipt = await txFlow.run({
      address: currentPool.poolAddress as `0x${string}`,
      abi: stakingPoolAbi,
      functionName: "stake",
      args: [parsedStake],
    });
    if (receipt) {
      setStakeAmount("");
      await refreshBalances();
    }
  }

  async function handleWithdraw() {
    if (!address || parsedUnstake <= 0n) return;
    const receipt = await txFlow.run({
      address: currentPool.poolAddress as `0x${string}`,
      abi: stakingPoolAbi,
      functionName: "withdraw",
      args: [parsedUnstake],
    });
    if (receipt) {
      setUnstakeAmount("");
      await refreshBalances();
    }
  }

  async function handleClaim() {
    if (!address || userEarnedRewards <= 0n) return;
    const receipt = await txFlow.run({
      address: currentPool.poolAddress as `0x${string}`,
      abi: stakingPoolAbi,
      functionName: "getReward",
      args: [],
    });
    if (receipt) {
      await refreshBalances();
    }
  }

  async function handleExit() {
    if (!address) return;
    const receipt = await txFlow.run({
      address: currentPool.poolAddress as `0x${string}`,
      abi: stakingPoolAbi,
      functionName: "exit",
      args: [],
    });
    if (receipt) {
      setUnstakeAmount("");
      await refreshBalances();
    }
  }

  // Filter pools list
  const filteredPools = pools.filter((p) => {
    if (filterType === "flexible" && BigInt(p.lockDuration) > 0n) return false;
    if (filterType === "locked" && BigInt(p.lockDuration) === 0n) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.stakingSymbol.toLowerCase().includes(q) ||
        p.poolAddress.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 32 }}>
        {/* Featured / Active Staking Card */}
        <section
          className="card"
          style={{
            position: "relative",
            overflow: "hidden",
            borderColor: currentPool.isOfficial ? "var(--accent)" : "var(--border)",
            boxShadow: currentPool.isOfficial ? "0 0 30px rgba(184, 243, 107, 0.08)" : undefined,
          }}
        >
          {currentPool.isOfficial && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                background: "var(--accent)",
                color: "#0a0c08",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "3px 12px",
                borderBottomLeftRadius: 6,
              }}
            >
              Featured Official Pool
            </div>
          )}

          <div style={{ padding: "24px 24px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="badge" style={{ fontSize: 11 }}>
                    <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true">
                      <use href="#i-sparkle" />
                    </svg>
                    {currentPool.stakingSymbol} → {currentPool.rewardSymbol}
                  </span>
                  <span className="badge badge-muted" style={{ fontSize: 11 }}>
                    {formatLockPolicy(currentPool.lockDuration)}
                  </span>
                </div>
                <h2 style={{ fontSize: 24, margin: "4px 0 6px" }}>{currentPool.name}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
                  <span>Contract:</span>
                  <a
                    href={`https://robinhoodchain.blockscout.com/address/${currentPool.poolAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono"
                    style={{ color: "var(--accent)", textDecoration: "none" }}
                    title="View verified on Blockscout"
                  >
                    {currentPool.poolAddress.slice(0, 8)}…{currentPool.poolAddress.slice(-6)}
                    <svg className="icon" style={{ width: 10, height: 10, marginLeft: 4 }} aria-hidden="true">
                      <use href="#i-up" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* APR Stat Box */}
              <div
                style={{
                  background: "rgba(184, 243, 107, 0.08)",
                  border: "1px solid rgba(184, 243, 107, 0.2)",
                  borderRadius: 12,
                  padding: "12px 20px",
                  textAlign: "right",
                  minWidth: 150,
                }}
              >
                <span style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                  Estimated APR
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--accent)",
                    lineHeight: 1.1,
                    display: "block",
                  }}
                >
                  {currentPool.apr > 0 ? `${currentPool.apr.toFixed(1)}%` : "Active"}
                </span>
                <small style={{ fontSize: 10, color: "var(--muted)" }}>Continuous O(1) Yield</small>
              </div>
            </div>

            {/* Metrics Row */}
            <div
              className="metric-grid"
              style={{
                marginTop: 20,
                marginBottom: 20,
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              }}
            >
              <div className="metric">
                <span>Total Pool Staked</span>
                <strong className="mono">
                  {formatTokenAmount(poolTotalStaked > 0n ? poolTotalStaked : BigInt(currentPool.totalStaked), sDecimals)}
                </strong>
                <small>{currentPool.stakingSymbol}</small>
              </div>

              <div className="metric">
                <span>Your Staked Amount</span>
                <strong className="mono" style={{ color: userStakedBalance > 0n ? "var(--accent)" : "inherit" }}>
                  {formatTokenAmount(userStakedBalance, sDecimals)}
                </strong>
                <small>{currentPool.stakingSymbol}</small>
              </div>

              <div className="metric accent">
                <span>Earned Rewards</span>
                <strong className="mono" style={{ color: "var(--accent)" }}>
                  {formatTokenAmount(userEarnedRewards, rDecimals)}
                </strong>
                <small>{currentPool.rewardSymbol} (Unclaimed)</small>
              </div>

              <div className="metric">
                <span>Your Wallet Balance</span>
                <strong className="mono">
                  {formatTokenAmount(userTokenBalance, sDecimals)}
                </strong>
                <small>{currentPool.stakingSymbol}</small>
              </div>
            </div>
          </div>

          {/* Interactive Staking Actions Sub-card */}
          <div
            style={{
              background: "var(--surface-2)",
              borderTop: "1px solid var(--border)",
              padding: "20px 24px",
            }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "stake" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("stake")}
              >
                Stake Tokens
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "unstake" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("unstake")}
              >
                Unstake
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "claim" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("claim")}
              >
                Harvest Rewards
                {userEarnedRewards > 0n && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      marginLeft: 6,
                    }}
                  />
                )}
              </button>
            </div>

            {!isConnected ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ color: "var(--muted)", marginBottom: 14 }}>
                  Connect your wallet to stake tokens and earn real-time yield.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => connect({ connector: connectors[0] })}
                  disabled={connecting}
                >
                  <svg className="icon" aria-hidden="true"><use href="#i-wallet" /></svg>
                  {connecting ? "Connecting..." : "Connect Wallet"}
                </button>
              </div>
            ) : wrongNetwork ? (
              <div style={{ color: "var(--warning)", padding: "12px 0", fontSize: 13 }}>
                Please switch to Robinhood Chain Mainnet (Chain ID 4663) in your wallet.
              </div>
            ) : activeTab === "stake" ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "var(--text-2)" }}>Amount to Stake</span>
                  <span style={{ color: "var(--muted)" }}>
                    Available: <span className="mono">{formatTokenAmount(userTokenBalance, sDecimals)}</span> {currentPool.stakingSymbol}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    className="input mono"
                    placeholder="0.0"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    style={{ flex: 1, fontSize: 16 }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "0 8px", fontSize: 11 }}
                        onClick={() => setStakePct(pct)}
                      >
                        {pct === 100 ? "MAX" : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {needsApproval ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "12px" }}
                    onClick={handleApprove}
                    disabled={txFlow.status === "awaiting_wallet" || txFlow.status === "submitted"}
                  >
                    {txFlow.status === "awaiting_wallet"
                      ? "Confirm Approval in Wallet..."
                      : txFlow.status === "submitted"
                      ? "Approving..."
                      : `Approve ${currentPool.stakingSymbol}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "12px" }}
                    onClick={handleStake}
                    disabled={
                      parsedStake <= 0n ||
                      parsedStake > userTokenBalance ||
                      txFlow.status === "awaiting_wallet" ||
                      txFlow.status === "submitted"
                    }
                  >
                    {txFlow.status === "awaiting_wallet"
                      ? "Confirm Stake in Wallet..."
                      : txFlow.status === "submitted"
                      ? "Staking..."
                      : `Stake ${currentPool.stakingSymbol}`}
                  </button>
                )}
              </div>
            ) : activeTab === "unstake" ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "var(--text-2)" }}>Amount to Unstake</span>
                  <span style={{ color: "var(--muted)" }}>
                    Staked: <span className="mono">{formatTokenAmount(userStakedBalance, sDecimals)}</span> {currentPool.stakingSymbol}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    className="input mono"
                    placeholder="0.0"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    style={{ flex: 1, fontSize: 16 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "0 12px", fontSize: 11 }}
                    onClick={() => setUnstakePct(100)}
                  >
                    MAX
                  </button>
                </div>

                {isLocked && (
                  <div
                    style={{
                      background: "rgba(255, 180, 0, 0.08)",
                      border: "1px solid rgba(255, 180, 0, 0.2)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 12,
                      fontSize: 12,
                      color: "#ffd460",
                    }}
                  >
                    ⚠️ <strong>Lock Active:</strong> This pool has a timelock policy.
                    Tokens will be unlocked in <strong>{formatTimeRemaining(remainingLockSec)}</strong>.
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "12px" }}
                    onClick={handleWithdraw}
                    disabled={
                      parsedUnstake <= 0n ||
                      parsedUnstake > userStakedBalance ||
                      isLocked ||
                      txFlow.status === "awaiting_wallet" ||
                      txFlow.status === "submitted"
                    }
                  >
                    {isLocked ? "Locked Until Timelock Expires" : `Withdraw ${currentPool.stakingSymbol}`}
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 11, color: "var(--danger)" }}
                    onClick={async () => {
                      if (confirm("Emergency withdraw retrieves your principal immediately without reward calculation. Continue?")) {
                        await txFlow.run({
                          address: currentPool.poolAddress as `0x${string}`,
                          abi: stakingPoolAbi,
                          functionName: "emergencyWithdraw",
                          args: [],
                        });
                        await refreshBalances();
                      }
                    }}
                    title="Emergency withdraw principal without calculating rewards"
                  >
                    Emergency Exit
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>Claimable Yield</span>
                    <strong className="mono" style={{ fontSize: 24, color: "var(--accent)" }}>
                      {formatTokenAmount(userEarnedRewards, rDecimals)} {currentPool.rewardSymbol}
                    </strong>
                  </div>
                  <span className="badge" style={{ fontSize: 11 }}>
                    Auto-compounding / Continuous
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "12px" }}
                    onClick={handleClaim}
                    disabled={userEarnedRewards <= 0n || txFlow.status === "awaiting_wallet" || txFlow.status === "submitted"}
                  >
                    Harvest Rewards
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "12px 18px" }}
                    onClick={handleExit}
                    disabled={userStakedBalance <= 0n || isLocked || txFlow.status === "awaiting_wallet" || txFlow.status === "submitted"}
                    title="Withdraw all staked tokens and harvest all earned rewards"
                  >
                    Exit Pool (Unstake & Harvest)
                  </button>
                </div>
              </div>
            )}

            {txFlow.status === "error" && (
              <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 10 }}>
                {txFlow.errorMessage ?? "Transaction encountered an error."}
              </div>
            )}
          </div>
        </section>

        {/* All Staking Pools Section */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 20, margin: 0 }}>All Staking Reward Pools</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>
                Stake $DAM or any community token launched on Robinhood Chain.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCreateModalOpen(true)}
            >
              <svg className="icon" aria-hidden="true"><use href="#i-sparkle" /></svg>
              + Launch Staking Pool
            </button>
          </div>

          {/* Filters & Search */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div className="filter-tabs">
              <button
                type="button"
                className={filterType === "all" ? "active" : ""}
                onClick={() => setFilterType("all")}
                style={{
                  background: filterType === "all" ? "var(--surface-3)" : "transparent",
                  color: filterType === "all" ? "var(--text)" : "var(--muted)",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                All Pools
              </button>
              <button
                type="button"
                onClick={() => setFilterType("flexible")}
                style={{
                  background: filterType === "flexible" ? "var(--surface-3)" : "transparent",
                  color: filterType === "flexible" ? "var(--text)" : "var(--muted)",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Flexible Only
              </button>
              <button
                type="button"
                onClick={() => setFilterType("locked")}
                style={{
                  background: filterType === "locked" ? "var(--surface-3)" : "transparent",
                  color: filterType === "locked" ? "var(--text)" : "var(--muted)",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Timelocked
              </button>
            </div>

            <div style={{ minWidth: 220 }}>
              <input
                type="text"
                className="input"
                placeholder="Search by token or pool..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
          </div>

          {/* Pools Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>Pool Name</th>
                  <th>Pair</th>
                  <th>Lock Policy</th>
                  <th>Total Staked</th>
                  <th>Estimated APR</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPools.map((pool) => {
                  const isSelected = pool.poolAddress.toLowerCase() === activePoolAddress.toLowerCase();
                  return (
                    <tr
                      key={pool.poolAddress}
                      style={{
                        background: isSelected ? "rgba(184, 243, 107, 0.04)" : undefined,
                      }}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={pool.isOfficial ? "badge" : "badge badge-muted"}>
                            <svg className="icon" style={{ width: 10, height: 10 }} aria-hidden="true">
                              <use href="#i-sparkle" />
                            </svg>
                            {pool.isOfficial ? "Official" : "Community"}
                          </span>
                          <div>
                            <strong style={{ display: "block" }}>{pool.name}</strong>
                            <span className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>
                              {pool.poolAddress.slice(0, 6)}…{pool.poolAddress.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="mono">
                          {pool.stakingSymbol} → {pool.rewardSymbol}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ fontSize: 11 }}>
                          {formatLockPolicy(pool.lockDuration)}
                        </span>
                      </td>
                      <td className="mono">
                        {formatTokenAmount(BigInt(pool.totalStaked), pool.stakingDecimals)} {pool.stakingSymbol}
                      </td>
                      <td className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>
                        {pool.apr > 0 ? `${pool.apr.toFixed(1)}%` : "Active"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <a
                            href={`https://robinhoodchain.blockscout.com/address/${pool.poolAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            title="Verify on Blockscout"
                          >
                            Proof
                          </a>
                          <button
                            type="button"
                            className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => {
                              setActivePoolAddress(pool.poolAddress);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            {isSelected ? "Active" : "Select & Stake"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <CreatePoolModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(newPool) => {
          setActivePoolAddress(newPool);
          setCreateModalOpen(false);
        }}
      />
    </>
  );
}
