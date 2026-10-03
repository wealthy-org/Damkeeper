"use client";

import { useEffect, useRef, useState } from "react";
import { chainById } from "@/lib/chains";
import { shortAddress } from "@/lib/position-view";

export interface BurnSuccessDetails {
  txHash: string;
  amount: string;
  symbol: string;
  tokenAddress: string;
  burnMode: "burn" | "dead";
  initialSupply: string;
  newSupply: string;
  pctReduction: string;
  chainId?: number;
}

export function BurnSuccessModal({
  open,
  details,
  onClose,
}: {
  open: boolean;
  details: BurnSuccessDetails | null;
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

  const chainId = details.chainId ?? 4663;
  const chain = chainById(chainId);
  const explorerUrl = chain?.blockExplorers?.default?.url ?? "https://robinhoodchain.blockscout.com";
  const txUrl = `${explorerUrl}/tx/${details.txHash}`;

  const isNativeBurn = details.burnMode === "burn";

  const tweetText = encodeURIComponent(
    `🔥 Proof of Burn on Robinhood Chain!\n\n` +
    `Just permanently destroyed ${details.amount} $${details.symbol} via @damkeeper_fi!\n` +
    `• Supply reduction: -${details.pctReduction}%\n` +
    `• Mechanism: ${isNativeBurn ? "Native burn() (totalSupply reduced)" : "Transferred to 0x...dEaD"}\n` +
    `• New Total Supply: ${details.newSupply} $${details.symbol}\n\n` +
    `On-Chain Proof: ${txUrl}\n\n` +
    `#RobinhoodChain #Damkeeper #ProofOfBurn`
  );

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
      className="modal burn-modal"
      aria-labelledby="burn-success-title"
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bsm-hero">
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

        <div className="bsm-badge-wrap">
          <span className="bsm-icon-ring r1" />
          <span className="bsm-icon-ring r2" />
          <div className="bsm-icon">
            <svg className="icon-lg" aria-hidden="true" style={{ width: 28, height: 28 }}>
              <use href="#i-flame" />
            </svg>
          </div>
        </div>

        <div className="pill" style={{ marginTop: 14, borderColor: "rgba(255, 122, 69, 0.4)", background: "rgba(255, 122, 69, 0.12)", color: "#ff7a45" }}>
          <span className="status-dot" style={{ background: "#ff7a45", boxShadow: "0 0 8px #ff7a45" }} />
          Robinhood Chain · Confirmed
        </div>

        <h2 id="burn-success-title" className="wsm-title" style={{ marginTop: 10 }}>
          Tokens Permanently Burned!
        </h2>
        <p className="wsm-subtitle">
          The token destruction was mined and confirmed on Robinhood Chain Mainnet with cryptographic proof.
        </p>
      </div>

      <div className="modal-body" style={{ paddingTop: 14, paddingBottom: 16 }}>
        <div className="bsm-amount-card">
          <small className="bsm-amount-label">
            TOTAL AMOUNT DESTROYED
          </small>
          <div className="bsm-amount-val">
            <span className="bsm-amount-num">{details.amount}</span>
            <span className="bsm-amount-sym">{details.symbol}</span>
          </div>
        </div>

        <dl className="kv">
          <div className="kv-row">
            <dt>Execution</dt>
            <dd>
              <span
                className="badge"
                style={{
                  background: isNativeBurn ? "rgba(255, 122, 69, 0.15)" : "rgba(255, 255, 255, 0.08)",
                  color: isNativeBurn ? "#ff7a45" : "var(--muted)",
                  borderColor: isNativeBurn ? "rgba(255, 122, 69, 0.3)" : "var(--hair)",
                }}
              >
                {isNativeBurn ? "🔥 Native burn()" : "☠️ 0x...dEaD Sink"}
              </span>
            </dd>
          </div>

          <div className="kv-row">
            <dt>Circulating Impact</dt>
            <dd style={{ color: "var(--accent)", fontWeight: 600 }}>
              -{details.pctReduction}% of supply
            </dd>
          </div>

          <div className="kv-row">
            <dt>Supply Before</dt>
            <dd className="mono">{details.initialSupply} {details.symbol}</dd>
          </div>

          <div className="kv-row">
            <dt>New Total Supply</dt>
            <dd className="mono" style={{ color: "#ff7a45", fontWeight: 600 }}>
              {details.newSupply} {details.symbol}
            </dd>
          </div>

          <div className="kv-row">
            <dt>Token Address</dt>
            <dd className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              <span>{shortAddress(details.tokenAddress)}</span>
              <button
                type="button"
                className="wsm-copy-btn"
                title="Copy token address"
                onClick={() => copy(details.tokenAddress, "addr")}
              >
                {copiedField === "addr" ? (
                  <span style={{ fontSize: 10, color: "#ff7a45" }}>Copied!</span>
                ) : (
                  <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true">
                    <use href="#i-copy" />
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
                  <span style={{ fontSize: 10, color: "#ff7a45" }}>Copied!</span>
                ) : (
                  <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true">
                    <use href="#i-copy" />
                  </svg>
                )}
              </button>
            </dd>
          </div>

          <div className="kv-row">
            <dt>Onchain Status</dt>
            <dd style={{ color: "#ff7a45", fontWeight: 500 }}>
              ✓ Mined in block
            </dd>
          </div>
        </dl>
      </div>

      <div className="modal-foot bsm-foot">
        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{
            background: "linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%)",
            borderColor: "#ff7a45",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <svg className="icon" aria-hidden="true" style={{ width: 13, height: 13 }}>
            <use href="#i-x" />
          </svg>
          Share Proof on X
        </a>
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          Blockscout
          <svg className="icon" aria-hidden="true">
            <use href="#i-up" />
          </svg>
        </a>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleClose}
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
