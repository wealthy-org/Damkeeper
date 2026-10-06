"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbi, isAddress } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import { stakingFactoryAbi } from "@/lib/abi";
import { DEFAULT_STAKING_FACTORY, DAM_TOKEN_ADDRESS } from "@/lib/staking";
import { useTxFlow } from "@/lib/use-tx-flow";

interface CreatePoolModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (poolAddress: string) => void;
}

const tokenAbi = parseAbi([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
]);

const LOCK_PRESETS = [
  { label: "Flexible (No timelock, unstake anytime)", value: 0 },
  { label: "7 Days lock", value: 7 * 86400 },
  { label: "14 Days lock", value: 14 * 86400 },
  { label: "30 Days lock", value: 30 * 86400 },
  { label: "90 Days lock", value: 90 * 86400 },
  { label: "180 Days lock", value: 180 * 86400 },
];

export function CreatePoolModal({ open, onClose, onSuccess }: CreatePoolModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const txFlow = useTxFlow();

  const [stakingToken, setStakingToken] = useState<string>(DAM_TOKEN_ADDRESS);
  const [rewardToken, setRewardToken] = useState<string>(DAM_TOKEN_ADDRESS);
  const [poolName, setPoolName] = useState<string>("$DAM Staking Vault");
  const [lockDuration, setLockDuration] = useState<number>(0);

  const [stakingSymbol, setStakingSymbol] = useState<string>("DAM");
  const [rewardSymbol, setRewardSymbol] = useState<string>("DAM");
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [deployedPoolAddress, setDeployedPoolAddress] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("modal-open");
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.classList.remove("modal-open");
    }
  }, [open]);

  // Lookup token symbols when addresses change
  useEffect(() => {
    if (!publicClient) return;

    let isCurrent = true;
    async function checkTokens() {
      setIsLoadingToken(true);
      try {
        if (isAddress(stakingToken)) {
          const sym = await publicClient!.readContract({
            address: stakingToken as `0x${string}`,
            abi: tokenAbi,
            functionName: "symbol",
          }).catch(() => null);
          if (isCurrent && sym) setStakingSymbol(sym);
        }
        if (isAddress(rewardToken)) {
          const sym = await publicClient!.readContract({
            address: rewardToken as `0x${string}`,
            abi: tokenAbi,
            functionName: "symbol",
          }).catch(() => null);
          if (isCurrent && sym) setRewardSymbol(sym);
        }
      } catch {
        // ignore fallback
      } finally {
        if (isCurrent) setIsLoadingToken(false);
      }
    }

    checkTokens();
    return () => {
      isCurrent = false;
    };
  }, [stakingToken, rewardToken, publicClient]);

  const isValid =
    isAddress(stakingToken) &&
    isAddress(rewardToken) &&
    poolName.trim().length >= 3 &&
    isConnected;

  async function handleDeploy() {
    if (!isValid || !address) return;

    const receipt = await txFlow.run({
      address: DEFAULT_STAKING_FACTORY,
      abi: stakingFactoryAbi,
      functionName: "createPool",
      args: [
        stakingToken as `0x${string}`,
        rewardToken as `0x${string}`,
        BigInt(lockDuration),
        poolName.trim(),
      ],
    });

    if (receipt && typeof receipt === "object" && "status" in receipt && receipt.status === "success") {
      // Find PoolCreated event log or read from factory
      let poolAddr: string | null = null;
      if (receipt.logs && receipt.logs.length > 0) {
        // First topic or emitted pool address is at topic[1] or contract address
        const log = receipt.logs[0];
        if (log && log.topics && log.topics[1]) {
          poolAddr = `0x${log.topics[1].slice(26)}`.toLowerCase();
        }
      }

      // Sync with indexer API
      if (poolAddr) {
        setDeployedPoolAddress(poolAddr);
        await fetch("/api/staking/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chainId: robinhoodMainnet.id,
            poolAddress: poolAddr,
            stakingToken,
            rewardToken,
            creator: address,
            lockDuration,
            name: poolName.trim(),
            txHash: receipt.transactionHash,
          }),
        }).catch(console.error);

        onSuccess?.(poolAddr);
      }
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} style={{ maxWidth: 540 }}>
      <div className="modal-head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge">
              <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true">
                <use href="#i-sparkle" />
              </svg>
              Permissionless Factory
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close modal">
            <svg className="icon" aria-hidden="true"><use href="#i-close" /></svg>
          </button>
        </div>
        <h2 style={{ marginTop: 10 }}>Create Staking Pool</h2>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          Deploy a Synthetix-style reward pool on Robinhood Chain. Anyone can stake tokens and earn continuous yield.
        </p>
      </div>

      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {deployedPoolAddress ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>🎉</div>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>Staking Pool Deployed!</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Your contract is live on Robinhood Chain Mainnet.
            </p>
            <div className="card" style={{ padding: 12, background: "var(--surface-2)", wordBreak: "break-all", fontSize: 12 }}>
              <span className="mono" style={{ color: "var(--accent)" }}>{deployedPoolAddress}</span>
            </div>
            <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 10 }}>
              <a
                href={`https://robinhoodchain.blockscout.com/address/${deployedPoolAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                View on Blockscout
              </a>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setDeployedPoolAddress(null);
                  onClose();
                  window.location.reload();
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>
                Pool Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. $DAM High Yield Vault"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>
                Staking Token Address (Users deposit this)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input mono"
                  placeholder="0x..."
                  value={stakingToken}
                  onChange={(e) => setStakingToken(e.target.value.trim())}
                  style={{ width: "100%", paddingRight: 70 }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--accent)",
                  }}
                >
                  {stakingSymbol}
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>
                Reward Token Address (Users harvest this)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input mono"
                  placeholder="0x..."
                  value={rewardToken}
                  onChange={(e) => setRewardToken(e.target.value.trim())}
                  style={{ width: "100%", paddingRight: 70 }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--accent)",
                  }}
                >
                  {rewardSymbol}
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>
                Lockup Policy
              </label>
              <select
                className="input"
                value={lockDuration}
                onChange={(e) => setLockDuration(Number(e.target.value))}
                style={{ width: "100%" }}
              >
                {LOCK_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="card"
              style={{
                background: "rgba(184, 243, 107, 0.04)",
                borderColor: "rgba(184, 243, 107, 0.15)",
                padding: "12px 14px",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "var(--accent)", display: "block", marginBottom: 2 }}>
                ℹ️ After Deployment
              </strong>
              You as the pool creator can notify and fund reward tokens at any time using{" "}
              <code className="mono">notifyRewardAmount()</code> or from the Damkeeper CLI.
            </div>

            {txFlow.status === "error" && (
              <div style={{ color: "var(--danger)", fontSize: 12 }}>
                {txFlow.errorMessage ?? "Transaction failed."}
              </div>
            )}
          </>
        )}
      </div>

      {!deployedPoolAddress && (
        <div className="modal-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isValid || txFlow.status === "awaiting_wallet" || txFlow.status === "submitted"}
            onClick={handleDeploy}
          >
            {txFlow.status === "awaiting_wallet"
              ? "Confirm in Wallet..."
              : txFlow.status === "submitted"
              ? "Deploying Pool..."
              : "Deploy Pool"}
          </button>
        </div>
      )}
    </dialog>
  );
}
