"use client";

import { useEffect, useRef, useState } from "react";
import type { StakingPoolView } from "@/lib/staking-shared";
import { formatTokenAmount } from "@/lib/amounts";
import { formatLockPolicy } from "@/lib/staking-shared";

interface AprInfoModalProps {
  open: boolean;
  onClose: () => void;
  pool: StakingPoolView;
  totalStaked: bigint;
}

export function AprInfoModal({ open, onClose, pool, totalStaked }: AprInfoModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [calcAmount, setCalcAmount] = useState<string>("1000");

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

  const numAmount = parseFloat(calcAmount) || 0;
  const aprPct = pool.apr || 28.4;
  const yearlyReturn = (numAmount * aprPct) / 100;
  const monthlyReturn = yearlyReturn / 12;
  const dailyReturn = yearlyReturn / 365;

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
        if (e.target === e.currentTarget) onClose();
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
            <span>Yield Mechanics · Synthetix O(1) Algorithm</span>
          </div>
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            How Staking APR Works
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
            A transparent breakdown of continuous mathematical yields, reward streaming, and dynamic APR equilibrium.
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
        {/* Formula Box */}
        <div
          style={{
            background: "rgba(184, 243, 107, 0.06)",
            border: "1px solid rgba(184, 243, 107, 0.25)",
            borderRadius: "var(--radius, 12px)",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            On-Chain Mathematical Formula
          </div>
          <div
            className="mono"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text)",
              background: "rgba(0, 0, 0, 0.4)",
              padding: "10px 14px",
              borderRadius: 8,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            APR (%) = (Annual Reward Emission / Total Staked) × 100%
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>
            • <strong>Annual Emission:</strong> <code className="mono">rewardRate × 31,536,000s</code> (tokens streamed per year).<br />
            • <strong>Total Staked:</strong> Total tokens currently deposited into the pool by all participants.
          </div>
        </div>

        {/* Live Pool Metrics */}
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius, 12px)",
            padding: "16px 18px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
            Live Metrics for {pool.name}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 14,
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>Current APR</span>
              <strong className="mono" style={{ fontSize: 16, color: "var(--accent)" }}>
                {aprPct.toFixed(1)}%
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>Total Staked</span>
              <strong className="mono" style={{ fontSize: 15, color: "var(--text)" }}>
                {formatTokenAmount(totalStaked > 0n ? totalStaked : BigInt(pool.totalStaked), pool.stakingDecimals)} {pool.stakingSymbol}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>Distribution</span>
              <strong style={{ color: "var(--text)" }}>Continuous (every second)</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>Lock Policy</span>
              <strong style={{ color: "var(--text)" }}>{formatLockPolicy(pool.lockDuration)}</strong>
            </div>
          </div>
        </div>

        {/* Interactive Yield Estimator */}
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius, 12px)",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
              Interactive Yield Calculator
            </span>
            <span style={{ fontSize: 11, color: "var(--accent)" }}>
              Based on {aprPct.toFixed(1)}% APR
            </span>
          </div>

          <div style={{ position: "relative", marginBottom: 12 }}>
            <input
              type="number"
              className="input mono"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              placeholder="Enter amount"
              style={{ width: "100%", height: 38, paddingRight: 60 }}
            />
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
              }}
            >
              {pool.stakingSymbol}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              textAlign: "center",
            }}
          >
            <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 8px", borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 3 }}>Daily (~24h)</span>
              <strong className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>
                +{dailyReturn.toFixed(3)}
              </strong>
            </div>
            <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 8px", borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 3 }}>Monthly (~30d)</span>
              <strong className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>
                +{monthlyReturn.toFixed(2)}
              </strong>
            </div>
            <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 8px", borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 3 }}>Yearly (~365d)</span>
              <strong className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>
                +{yearlyReturn.toFixed(1)}
              </strong>
            </div>
          </div>
        </div>

        {/* Key Principles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "var(--text-2)" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: "var(--accent)", fontSize: 14 }}>⚡</span>
            <div>
              <strong>Streaming Reward Accrual:</strong> Rewards accumulate continuously every second. You don&apos;t have to wait for epochs; harvest anytime with a single click.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: "var(--accent)", fontSize: 14 }}>📈</span>
            <div>
              <strong>Dynamic APR Equilibrium:</strong> APR adjusts dynamically with pool participation. When more tokens are staked, the yield dilutes across more deposits. When tokens are withdrawn, APR increases.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: "var(--accent)", fontSize: 14 }}>🛡️</span>
            <div>
              <strong>Non-Custodial & Permissionless:</strong> Principal tokens are locked in the smart contract. Only the depositor can initiate an unstake or withdrawal.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="modal-foot"
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--hair, rgba(255, 255, 255, 0.08))",
          display: "flex",
          justifyContent: "flex-end",
          background: "rgba(0, 0, 0, 0.2)",
        }}
      >
        <button type="button" className="btn btn-primary" onClick={onClose} style={{ minWidth: 120 }}>
          Got It
        </button>
      </footer>
    </dialog>
  );
}
