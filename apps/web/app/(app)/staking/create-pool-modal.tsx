"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbi, isAddress, getAddress } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import { stakingFactoryAbi } from "@/lib/abi";
import { DEFAULT_STAKING_FACTORY, DAM_TOKEN_ADDRESS } from "@/lib/staking-shared";
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
  { label: "Flexible", sub: "Unstake anytime", value: 0 },
  { label: "7 Days", sub: "1 week lock", value: 7 * 86400 },
  { label: "14 Days", sub: "2 weeks lock", value: 14 * 86400 },
  { label: "30 Days", sub: "1 month lock", value: 30 * 86400 },
  { label: "90 Days", sub: "3 months lock", value: 90 * 86400 },
  { label: "180 Days", sub: "6 months lock", value: 180 * 86400 },
];

export function CreatePoolModal({ open, onClose, onSuccess }: CreatePoolModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const txFlow = useTxFlow();

  const [stakingToken, setStakingToken] = useState<string>(DAM_TOKEN_ADDRESS);
  const [rewardToken, setRewardToken] = useState<string>(DAM_TOKEN_ADDRESS);
  const [poolName, setPoolName] = useState<string>("$DAM Community Staking Vault");
  const [lockDuration, setLockDuration] = useState<number>(0);

  const [stakingSymbol, setStakingSymbol] = useState<string>("DAM");
  const [stakingName, setStakingName] = useState<string>("Damkeeper");
  const [rewardSymbol, setRewardSymbol] = useState<string>("DAM");
  const [rewardName, setRewardName] = useState<string>("Damkeeper");
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [deployedPoolAddress, setDeployedPoolAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Lookup token symbols and names when addresses change
  useEffect(() => {
    if (!publicClient) return;

    let isCurrent = true;
    async function checkTokens() {
      setIsLoadingToken(true);
      try {
        if (isAddress(stakingToken)) {
          const checksumStaking = getAddress(stakingToken);
          const [sym, nm] = await Promise.all([
            publicClient!.readContract({
              address: checksumStaking,
              abi: tokenAbi,
              functionName: "symbol",
            }).catch(() => null),
            publicClient!.readContract({
              address: checksumStaking,
              abi: tokenAbi,
              functionName: "name",
            }).catch(() => null),
          ]);
          if (isCurrent) {
            if (sym) setStakingSymbol(sym);
            if (nm) setStakingName(nm);
          }
        } else {
          if (isCurrent) {
            setStakingSymbol("TOKEN");
            setStakingName("");
          }
        }

        if (isAddress(rewardToken)) {
          const checksumReward = getAddress(rewardToken);
          const [sym, nm] = await Promise.all([
            publicClient!.readContract({
              address: checksumReward,
              abi: tokenAbi,
              functionName: "symbol",
            }).catch(() => null),
            publicClient!.readContract({
              address: checksumReward,
              abi: tokenAbi,
              functionName: "name",
            }).catch(() => null),
          ]);
          if (isCurrent) {
            if (sym) setRewardSymbol(sym);
            if (nm) setRewardName(nm);
          }
        } else {
          if (isCurrent) {
            setRewardSymbol("TOKEN");
            setRewardName("");
          }
        }
      } catch {
        // fallback
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
        getAddress(stakingToken),
        getAddress(rewardToken),
        BigInt(lockDuration),
        poolName.trim(),
      ],
    });

    if (receipt && typeof receipt === "object" && "status" in receipt && receipt.status === "success") {
      let poolAddr: string | null = null;
      if (receipt.logs && receipt.logs.length > 0) {
        const log = receipt.logs[0];
        if (log && log.topics && log.topics[1]) {
          poolAddr = `0x${log.topics[1].slice(26)}`.toLowerCase();
        }
      }

      if (poolAddr) {
        setDeployedPoolAddress(poolAddr);
        await fetch("/api/staking/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chainId: robinhoodMainnet.id,
            poolAddress: poolAddr,
            stakingToken: stakingToken.toLowerCase(),
            rewardToken: rewardToken.toLowerCase(),
            creator: address.toLowerCase(),
            lockDuration,
            name: poolName.trim(),
            txHash: receipt.transactionHash,
          }),
        }).catch(console.error);

        onSuccess?.(poolAddr);
      }
    }
  }

  async function copyPoolAddress() {
    if (!deployedPoolAddress) return;
    try {
      await navigator.clipboard.writeText(deployedPoolAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={onClose}
      style={{
        maxWidth: 580,
        width: "100%",
        padding: 0,
        borderRadius: "var(--radius-lg, 16px)",
        border: "1px solid var(--border)",
        background: "var(--surface-1)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.15)",
        overflow: "hidden",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !deployedPoolAddress) onClose();
      }}
    >
      {/* Header */}
      <header
        className="modal-head"
        style={{
          padding: "22px 24px 18px",
          borderBottom: "1px solid var(--hair, rgba(255, 255, 255, 0.08))",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%)",
        }}
      >
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div className="page-eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot" />
            <span>Permissionless Factory · Robinhood Chain</span>
          </div>
          <h2
            id="create-staking-title"
            style={{
              margin: "0 0 6px",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Launch Staking Pool
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
            Deploy an audited Synthetix-style reward pool with continuous mathematical yield. Fully non-custodial and open to any token.
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Close modal"
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg className="icon" style={{ width: 14, height: 14 }} aria-hidden="true">
            <use href="#i-close" />
          </svg>
        </button>
      </header>

      {/* Body */}
      <div
        className="modal-body"
        style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxHeight: "75vh",
          overflowY: "auto",
        }}
      >
        {deployedPoolAddress ? (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(184, 243, 107, 0.12)",
                border: "1px solid rgba(184, 243, 107, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg className="icon" style={{ width: 28, height: 28, color: "var(--accent)" }} aria-hidden="true">
                <use href="#i-check" />
              </svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
              Staking Pool Deployed!
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
              Your pool contract is now live on Robinhood Chain Mainnet. Anyone can deposit and stake immediately.
            </p>

            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius, 10px)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <div style={{ textAlign: "left", overflow: "hidden" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 }}>
                  Pool Contract Address
                </span>
                <span className="mono" style={{ fontSize: 13, color: "var(--accent)", wordBreak: "break-all" }}>
                  {deployedPoolAddress}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={copyPoolAddress}
                style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true">
                  <use href="#i-copy" />
                </svg>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <a
                href={`https://robinhoodchain.blockscout.com/address/${deployedPoolAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                View on Blockscout
                <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true">
                  <use href="#i-up" />
                </svg>
              </a>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const target = deployedPoolAddress;
                  setDeployedPoolAddress(null);
                  onClose();
                  window.location.href = `/staking?pool=${target}`;
                }}
              >
                Open Pool & Stake
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Field 1: Pool Name */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
                  Pool Name
                </label>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Public identifier</span>
              </div>
              <input
                type="text"
                className="input"
                placeholder="e.g. $DAM Community Staking Vault"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                style={{ width: "100%", height: 42 }}
              />
            </div>

            {/* Field 2: Staking Token */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
                  Staking Token (Users Deposit)
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setStakingToken(DAM_TOKEN_ADDRESS);
                    setStakingSymbol("DAM");
                    setStakingName("Damkeeper");
                  }}
                  style={{ fontSize: 11, padding: "2px 8px", height: "auto" }}
                >
                  Use $DAM (Official)
                </button>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input mono"
                  placeholder="0x..."
                  value={stakingToken}
                  onChange={(e) => setStakingToken(e.target.value.trim())}
                  style={{ width: "100%", height: 42, paddingRight: 80, fontSize: 13 }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "rgba(184, 243, 107, 0.12)",
                    border: "1px solid rgba(184, 243, 107, 0.25)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {stakingSymbol}
                </span>
              </div>

              {isAddress(stakingToken) && stakingName && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                  <span>{stakingName} ({stakingSymbol}) verified on Robinhood Chain</span>
                </div>
              )}
            </div>

            {/* Field 3: Reward Token */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
                  Reward Token (Users Harvest)
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setRewardToken(stakingToken);
                      setRewardSymbol(stakingSymbol);
                      setRewardName(stakingName);
                    }}
                    style={{ fontSize: 11, padding: "2px 8px", height: "auto" }}
                  >
                    Same as Staking
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setRewardToken(DAM_TOKEN_ADDRESS);
                      setRewardSymbol("DAM");
                      setRewardName("Damkeeper");
                    }}
                    style={{ fontSize: 11, padding: "2px 8px", height: "auto" }}
                  >
                    Use $DAM
                  </button>
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input mono"
                  placeholder="0x..."
                  value={rewardToken}
                  onChange={(e) => setRewardToken(e.target.value.trim())}
                  style={{ width: "100%", height: 42, paddingRight: 80, fontSize: 13 }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "rgba(184, 243, 107, 0.12)",
                    border: "1px solid rgba(184, 243, 107, 0.25)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {rewardSymbol}
                </span>
              </div>

              {isAddress(rewardToken) && rewardName && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                  <span>{rewardName} ({rewardSymbol}) verified on Robinhood Chain</span>
                </div>
              )}
            </div>

            {/* Field 4: Lockup Policy Selector (Grid of Pills) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
                  Lockup / Unstake Policy
                </label>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Withdrawal rules</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}
              >
                {LOCK_PRESETS.map((p) => {
                  const isSelected = lockDuration === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setLockDuration(p.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius, 10px)",
                        border: isSelected
                          ? "1px solid var(--accent)"
                          : "1px solid var(--hair, rgba(255, 255, 255, 0.08))",
                        background: isSelected ? "rgba(184, 243, 107, 0.1)" : "var(--surface-2)",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: isSelected ? "var(--accent)" : "var(--text)",
                          marginBottom: 2,
                        }}
                      >
                        {p.label}
                      </div>
                      <div style={{ fontSize: 10, color: isSelected ? "var(--accent)" : "var(--muted)" }}>
                        {p.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 5: Live Configuration Summary Card */}
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius, 10px)",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 10,
                }}
              >
                Pool Architecture Preview
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <div>
                  <span style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>Pair</span>
                  <strong style={{ color: "var(--text)", fontWeight: 600 }}>
                    {stakingSymbol} → {rewardSymbol}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>Policy</span>
                  <strong style={{ color: "var(--text)", fontWeight: 600 }}>
                    {lockDuration === 0 ? "Flexible (Instant unstake)" : `${lockDuration / 86400} Days Timelock`}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>Yield Distribution</span>
                  <strong style={{ color: "var(--accent)", fontWeight: 600 }}>
                    Mathematical O(1) Continuous
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>Creation Fee</span>
                  <strong style={{ color: "var(--accent)", fontWeight: 600 }}>
                    0 ETH (Free)
                  </strong>
                </div>
              </div>
            </div>

            {/* Note */}
            <div
              style={{
                background: "rgba(184, 243, 107, 0.04)",
                border: "1px solid rgba(184, 243, 107, 0.15)",
                borderRadius: "var(--radius, 10px)",
                padding: "12px 14px",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--text-2)",
              }}
            >
              <strong style={{ color: "var(--accent)", display: "block", marginBottom: 3 }}>
                💡 Funding & Streaming Rewards
              </strong>
              After deployment, you as the creator can notify and stream reward tokens at any time using the pool&apos;s{" "}
              <code className="mono" style={{ color: "var(--accent)" }}>notifyRewardAmount()</code> method or via Damkeeper CLI.
            </div>

            {txFlow.status === "error" && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(255, 99, 71, 0.1)",
                  border: "1px solid rgba(255, 99, 71, 0.3)",
                  color: "var(--danger)",
                  fontSize: 12,
                }}
              >
                {txFlow.errorMessage ?? "Transaction failed."}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!deployedPoolAddress && (
        <footer
          className="modal-foot"
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--hair, rgba(255, 255, 255, 0.08))",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isValid || txFlow.status === "awaiting_wallet" || txFlow.status === "submitted"}
            onClick={handleDeploy}
            style={{ minWidth: 160 }}
          >
            {txFlow.status === "awaiting_wallet"
              ? "Confirm in Wallet..."
              : txFlow.status === "submitted"
              ? "Deploying Pool..."
              : "Deploy Staking Pool"}
          </button>
        </footer>
      )}
    </dialog>
  );
}
