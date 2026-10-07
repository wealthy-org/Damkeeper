"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { AirdropCampaignView } from "@/lib/airdrops-shared";
import { robinhoodMainnet } from "@/lib/chains";

interface ClaimModalProps {
  open: boolean;
  campaign: AirdropCampaignView | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClaimModal({ open, campaign, onClose, onSuccess }: ClaimModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { address } = useAccount();

  const [isClaiming, setIsClaiming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<string>("0");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("modal-open");
      setIsSuccess(false);
      setErrorMsg(null);
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.classList.remove("modal-open");
    }
  }, [open]);

  if (!campaign || !campaign.userAllocation) return null;

  const handleClaim = async () => {
    if (!address) return;
    setIsClaiming(true);
    setErrorMsg(null);

    try {
      // Simulate on-chain hash
      const randomHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      const res = await fetch("/api/airdrops/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: robinhoodMainnet.id,
          campaignId: campaign.campaignId,
          recipient: address,
          txHash: randomHash,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Claim failed");

      setClaimedAmount(campaign.userAllocation?.amount || "0");
      setTxHash(data.txHash || randomHash);
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Claim error:", err);
      setErrorMsg(err.message || "Failed to claim airdrop.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      style={{
        maxWidth: 480,
        width: "95vw",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        borderRadius: "var(--radius-lg, 16px)",
        padding: 0,
        overflow: "hidden",
      }}
      onClose={onClose}
    >
      <header
        className="modal-head"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(184, 243, 107, 0.12)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg className="icon" style={{ width: 18, height: 18 }}><use href="#i-gift" /></svg>
          </div>
          <div>
            <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700, color: "var(--text)" }}>
              {isSuccess ? "Claim Confirmed!" : "Claim Airdrop"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
              {campaign.name}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Close"
          style={{ width: 34, height: 34, flexShrink: 0 }}
        >
          <svg className="icon" style={{ width: 14, height: 14 }}><use href="#i-close" /></svg>
        </button>
      </header>

      <div className="modal-body" style={{ padding: "24px" }}>
        {!isSuccess ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                background: "rgba(184, 243, 107, 0.06)",
                border: "1px solid rgba(184, 243, 107, 0.25)",
                borderRadius: "var(--radius, 12px)",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Your Entitled Allocation
              </span>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", margin: "6px 0" }}>
                {Number(campaign.userAllocation?.amount || 0).toLocaleString()} {campaign.tokenSymbol}
              </div>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                {campaign.mode === "instant" ? "Instant Release to Wallet" : "Vesting Scheduled Release"}
              </span>
            </div>

            <div
              style={{
                background: "var(--surface-2)",
                padding: "14px 16px",
                borderRadius: 10,
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Claimer Address</span>
                <span className="mono" style={{ color: "var(--text)" }}>
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "-"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Token Contract</span>
                <span className="mono" style={{ color: "var(--text)" }}>
                  {campaign.token.slice(0, 8)}…{campaign.token.slice(-6)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Network</span>
                <span style={{ color: "var(--text)" }}>Robinhood Chain Mainnet</span>
              </div>
            </div>

            {errorMsg && (
              <div style={{ color: "var(--danger, #ff6363)", fontSize: 12, background: "rgba(255, 99, 99, 0.1)", padding: "10px 14px", borderRadius: 8 }}>
                {errorMsg}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(184, 243, 107, 0.15)",
                color: "var(--accent)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <svg className="icon" style={{ width: 26, height: 26 }}><use href="#i-check" /></svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
              Tokens Successfully Transferred!
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
              <strong>{Number(claimedAmount).toLocaleString()} {campaign.tokenSymbol}</strong> has been claimed to your wallet.
            </p>

            {txHash && (
              <a
                href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="chip mono"
                style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
              >
                View on Blockscout ↗
              </a>
            )}
          </div>
        )}
      </div>

      <div
        className="modal-foot"
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        {!isSuccess ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isClaiming}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleClaim}
              disabled={isClaiming}
            >
              {isClaiming ? "Processing Claim…" : `Confirm Claim (${campaign.tokenSymbol})`}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        )}
      </div>
    </dialog>
  );
}
