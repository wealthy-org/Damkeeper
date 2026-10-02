"use client";

import { useEffect, useRef, useState } from "react";
import { chainById } from "@/lib/chains";
import { shortAddress } from "@/lib/position-view";

export interface WithdrawSuccessDetails {
  kind: "lock" | "vesting";
  positionId: string;
  amount: string; // Formatted display amount (e.g. "5,000")
  tokenSymbol: string;
  tokenAddress?: string;
  managerAddress?: string;
  beneficiary: string;
  txHash: string;
  chainId?: number;
}

export function WithdrawSuccessModal({
  open,
  details,
  onClose,
}: {
  open: boolean;
  details: WithdrawSuccessDetails | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copiedField, setCopiedField] = useState<"addr" | "tx" | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && details && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("modal-open");
    } else if ((!open || !details) && dialog.open) {
      dialog.close();
      document.body.classList.remove("modal-open");
    }
  }, [open, details]);

  if (!details) return null;

  const isVesting = details.kind === "vesting";
  const chainId = details.chainId ?? 4663;
  const chain = chainById(chainId);
  const explorerUrl = chain?.blockExplorers?.default?.url ?? "https://robinhoodchain.blockscout.com";
  const txUrl = `${explorerUrl}/tx/${details.txHash}`;

  async function copy(val: string, field: "addr" | "tx") {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // fallback
    }
  }

  function handleClose() {
    ref.current?.close();
    document.body.classList.remove("modal-open");
    onClose();
  }

  return (
    <dialog
      ref={ref}
      className="modal withdraw-modal"
      aria-labelledby="withdraw-success-title"
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="wsm-hero">
        <button
          type="button"
          className="wsm-close-btn"
          aria-label="Close"
          onClick={handleClose}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#i-close" />
          </svg>
        </button>

        <div className="wsm-badge-wrap">
          <span className="wsm-icon-ring r1" />
          <span className="wsm-icon-ring r2" />
          <div className="wsm-icon">
            <svg className="icon-lg" aria-hidden="true">
              <use href="#i-check" />
            </svg>
          </div>
        </div>

        <div className="pill" style={{ marginTop: 14 }}>
          <span className="status-dot live" />
          {chain?.name ?? "Robinhood Chain"} · Confirmed
        </div>

        <h2 id="withdraw-success-title" className="wsm-title">
          {isVesting ? "Tokens Claimed!" : "Withdrawal Successful!"}
        </h2>
        <p className="wsm-subtitle">
          {isVesting
            ? "Your vested allocation has been claimed and transferred to your wallet onchain."
            : "Your locked allocation has been unlocked and sent directly to your beneficiary wallet."}
        </p>
      </div>

      <div className="modal-body" style={{ paddingTop: 14, paddingBottom: 16 }}>
        <div className="wsm-amount-card">
          <small className="wsm-amount-label">
            {isVesting ? "AMOUNT CLAIMED" : "AMOUNT WITHDRAWN"}
          </small>
          <div className="wsm-amount-val">
            <span className="wsm-amount-num">{details.amount}</span>
            <span className="wsm-amount-sym">{details.tokenSymbol}</span>
          </div>
        </div>

        <dl className="kv">
          <div className="kv-row">
            <dt>Position</dt>
            <dd>
              <span className="badge">
                {isVesting ? "Vesting" : "Lock"} #{details.positionId}
              </span>
            </dd>
          </div>

          <div className="kv-row">
            <dt>Recipient</dt>
            <dd className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              <span>{shortAddress(details.beneficiary)}</span>
              <button
                type="button"
                className="wsm-copy-btn"
                title="Copy recipient address"
                onClick={() => copy(details.beneficiary, "addr")}
              >
                {copiedField === "addr" ? (
                  <span style={{ fontSize: 10, color: "var(--accent)" }}>Copied!</span>
                ) : (
                  <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true">
                    <use href="#i-link" />
                  </svg>
                )}
              </button>
            </dd>
          </div>

          <div className="kv-row">
            <dt>Transaction</dt>
            <dd className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              <span>{shortAddress(details.txHash)}</span>
              <button
                type="button"
                className="wsm-copy-btn"
                title="Copy transaction hash"
                onClick={() => copy(details.txHash, "tx")}
              >
                {copiedField === "tx" ? (
                  <span style={{ fontSize: 10, color: "var(--accent)" }}>Copied!</span>
                ) : (
                  <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true">
                    <use href="#i-link" />
                  </svg>
                )}
              </button>
            </dd>
          </div>

          <div className="kv-row">
            <dt>Contract Vault</dt>
            <dd className="mono">
              {details.managerAddress ? shortAddress(details.managerAddress) : details.kind === "lock" ? "DamkeeperLockManager" : "DamkeeperVestingManager"}
            </dd>
          </div>

          <div className="kv-row">
            <dt>Network</dt>
            <dd>{chain?.name ?? "Robinhood Chain"} ({chainId})</dd>
          </div>

          <div className="kv-row">
            <dt>Onchain Status</dt>
            <dd style={{ color: "var(--accent)", fontWeight: 500 }}>
              ✓ Confirmed in block
            </dd>
          </div>
        </dl>
      </div>

      <div className="modal-foot wsm-foot">
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          View on Blockscout
          <svg className="icon" aria-hidden="true">
            <use href="#i-up" />
          </svg>
        </a>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleClose}
        >
          Done
        </button>
      </div>
    </dialog>
  );
}
