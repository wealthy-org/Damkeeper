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
  const isDam =
    details.tokenAddress.toLowerCase() === "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4".toLowerCase();

  const contractionFormatted = details.pctReduction.startsWith("<")
    ? "< -0.000001%"
    : `-${details.pctReduction}%`;

  const tweetParams = new URLSearchParams({
    text:
      `🔥 Burned ${details.amount} $${details.symbol} on Robinhood Chain!\n\n` +
      `Permanently destroyed via @damkeeper_fi\n` +
      `• Contraction: ${contractionFormatted}\n` +
      `• Mechanism: ${isNativeBurn ? "Native burn()" : "Dead Sink (0x...dEaD)"}\n` +
      `• New Supply: ${details.newSupply} $${details.symbol}\n\n` +
      `#RobinhoodChain #Damkeeper`,
    url: txUrl,
  });
  const tweetHref = `https://twitter.com/intent/tweet?${tweetParams.toString()}`;

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

        <div className="pill" style={{ marginTop: 14 }}>
          <span className="status-dot live" />
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
            <span className="bsm-amount-sym" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {isDam && (
                <img
                  src="/logo-symbol.png"
                  alt=""
                  width={20}
                  height={20}
                  style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              )}
              {details.symbol}
            </span>
          </div>
        </div>

        <dl className="kv">
          <div className="kv-row">
            <dt>Execution</dt>
            <dd>
              <span
                className="badge"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg className="icon" aria-hidden="true" style={{ width: 12, height: 12, color: "var(--accent)" }}>
                  <use href={isNativeBurn ? "#i-flame" : "#i-dead"} />
                </svg>
                {isNativeBurn ? "Native burn()" : "0x...dEaD Sink"}
              </span>
            </dd>
          </div>

          <div className="kv-row">
            <dt>Circulating Impact</dt>
            <dd style={{ color: "var(--accent)", fontWeight: 600 }}>
              {contractionFormatted} of supply
            </dd>
          </div>

          <div className="kv-row">
            <dt>Supply Before</dt>
            <dd className="mono">{details.initialSupply} {details.symbol}</dd>
          </div>

          <div className="kv-row">
            <dt>New Total Supply</dt>
            <dd className="mono" style={{ fontWeight: 600 }}>
              {details.newSupply} {details.symbol}
            </dd>
          </div>

          <div className="kv-row">
            <dt>Token Address</dt>
            <dd className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              {isDam && (
                <img
                  src="/logo-symbol.png"
                  alt=""
                  width={14}
                  height={14}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              )}
              <span>{shortAddress(details.tokenAddress)}</span>
              <button
                type="button"
                className="wsm-copy-btn"
                title="Copy token address"
                onClick={() => copy(details.tokenAddress, "addr")}
              >
                {copiedField === "addr" ? (
                  <span style={{ fontSize: 10, color: "var(--accent)" }}>Copied!</span>
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
                  <span style={{ fontSize: 10, color: "var(--accent)" }}>Copied!</span>
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
            <dd style={{ color: "var(--accent)", fontWeight: 500 }}>
              ✓ Mined in block
            </dd>
          </div>
        </dl>
      </div>

      <div className="bsm-foot">
        <a
          href={tweetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary bsm-share-btn"
        >
          <svg className="icon" aria-hidden="true" style={{ width: 15, height: 15 }}>
            <use href="#i-x" />
          </svg>
          Share Proof on X
        </a>
        <div className="bsm-sub-actions">
          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: "center" }}
          >
            Blockscout <svg className="icon" aria-hidden="true" style={{ width: 12, height: 12 }}><use href="#i-up" /></svg>
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
