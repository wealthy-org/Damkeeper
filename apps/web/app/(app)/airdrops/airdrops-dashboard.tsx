"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import type { AirdropCampaignView } from "@/lib/airdrops-shared";
import { CreateAirdropModal } from "./create-airdrop-modal";
import { ClaimModal } from "./claim-modal";
import { robinhoodMainnet } from "@/lib/chains";
import { AirdropShareButton } from "../share/share-button";

interface AirdropsDashboardProps {
  initialCampaigns?: AirdropCampaignView[];
}

export function AirdropsDashboard({ initialCampaigns = [] }: AirdropsDashboardProps) {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const [activeTab, setActiveTab] = useState<"claimable" | "upcoming" | "created" | "all">("claimable");
  const [campaigns, setCampaigns] = useState<AirdropCampaignView[]>(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClaimCampaign, setSelectedClaimCampaign] = useState<AirdropCampaignView | null>(null);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("chainId", `${robinhoodMainnet.id}`);
      params.set("tab", activeTab);
      if (address) params.set("user", address);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/airdrops/campaigns?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.warn("Failed to fetch airdrops:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [activeTab, address, searchQuery]);

  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.id === "injected") || connectors[0];
    if (injected) connect({ connector: injected });
  };

  return (
    <main className="main" style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "var(--text)" }}>
              Airdrops
            </h1>
            <span
              className="chip mono"
              style={{
                background: "rgba(184, 243, 107, 0.12)",
                color: "var(--accent)",
                fontSize: 11,
                border: "1px solid rgba(184, 243, 107, 0.3)",
              }}
            >
              Robinhood Chain
            </span>
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "6px 0 0", maxWidth: 600 }}>
            Use Airdrops to distribute tokens instantly, over time, or based on conditions to your community.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreateOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 42 }}
        >
          <svg className="icon" style={{ width: 16, height: 16 }}><use href="#i-gift" /></svg>
          + Create Airdrop
        </button>
      </div>

      {/* ── Tabs & Controls Bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: 12,
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="chip"
            onClick={() => setActiveTab("claimable")}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === "claimable" ? "var(--surface-2)" : "transparent",
              color: activeTab === "claimable" ? "var(--accent)" : "var(--muted)",
              borderColor: activeTab === "claimable" ? "var(--border)" : "transparent",
            }}
          >
            Claimable
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setActiveTab("upcoming")}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === "upcoming" ? "var(--surface-2)" : "transparent",
              color: activeTab === "upcoming" ? "var(--accent)" : "var(--muted)",
              borderColor: activeTab === "upcoming" ? "var(--border)" : "transparent",
            }}
          >
            Upcoming
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setActiveTab("created")}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === "created" ? "var(--surface-2)" : "transparent",
              color: activeTab === "created" ? "var(--accent)" : "var(--muted)",
              borderColor: activeTab === "created" ? "var(--border)" : "transparent",
            }}
          >
            Created
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setActiveTab("all")}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === "all" ? "var(--surface-2)" : "transparent",
              color: activeTab === "all" ? "var(--accent)" : "var(--muted)",
              borderColor: activeTab === "all" ? "var(--border)" : "transparent",
            }}
          >
            All Campaigns
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns…"
              style={{ width: 220, height: 34, fontSize: 12, paddingLeft: 30 }}
            />
            <svg
              className="icon"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 13,
                height: 13,
                color: "var(--muted)",
              }}
            >
              <use href="#i-search" />
            </svg>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={fetchCampaigns}
            title="Refresh"
            style={{ width: 34, height: 34 }}
          >
            <svg className="icon" style={{ width: 14, height: 14 }}><use href="#i-sparkle" /></svg>
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      {isLoading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
          Loading airdrop campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-lg, 16px)",
            padding: "54px 24px",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.01)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--surface-2)",
              color: "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg className="icon" style={{ width: 24, height: 24 }}><use href="#i-gift" /></svg>
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>
            {activeTab === "claimable"
              ? "No claimable airdrops"
              : activeTab === "upcoming"
              ? "No upcoming airdrops"
              : activeTab === "created"
              ? "No created airdrops yet"
              : "No campaigns found"}
          </h3>

          <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 380, margin: "0 auto 20px" }}>
            {activeTab === "claimable" && !isConnected
              ? "Connect your wallet to see if you have any claimable token airdrops."
              : activeTab === "claimable" && isConnected
              ? "Your connected wallet is not listed in any active airdrop allocations or has already claimed them."
              : activeTab === "created"
              ? "You haven't launched any airdrop campaigns. Click below to create one for your community."
              : "Try switching tabs or adjusting your search filters."}
          </p>

          {activeTab === "claimable" && !isConnected ? (
            <button type="button" className="btn btn-primary" onClick={handleConnectWallet}>
              Connect Wallet
            </button>
          ) : activeTab === "created" ? (
            <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              + Create New Airdrop
            </button>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {campaigns.map((c) => {
            const hasAllocation = Boolean(c.userAllocation);
            const isClaimed = Boolean(c.userAllocation?.isClaimed);
            const isEligibleToClaim = hasAllocation && !isClaimed;

            return (
              <div
                key={c.campaignId}
                className="card"
                style={{
                  background: "var(--surface-2)",
                  border: isEligibleToClaim
                    ? "1px solid rgba(184, 243, 107, 0.4)"
                    : "1px solid var(--border)",
                  borderRadius: "var(--radius-lg, 16px)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  boxShadow: isEligibleToClaim ? "0 4px 20px rgba(184, 243, 107, 0.08)" : "none",
                }}
              >
                <div>
                  {/* Top Bar: Token & Mode Pill */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: "rgba(184, 243, 107, 0.15)",
                          color: "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        {c.tokenSymbol.slice(0, 3)}
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                        {c.token.slice(0, 6)}…{c.token.slice(-4)}
                      </span>
                    </div>

                    <span
                      className="chip"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "4px 8px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        background: c.mode === "instant" ? "rgba(184, 243, 107, 0.1)" : "rgba(125, 211, 252, 0.1)",
                        color: c.mode === "instant" ? "var(--accent)" : "rgb(125, 211, 252)",
                        borderColor: c.mode === "instant" ? "rgba(184, 243, 107, 0.25)" : "rgba(125, 211, 252, 0.25)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 9 }}>{c.mode === "instant" ? "⚡" : "⏳"}</span>
                      {c.mode === "instant" ? "Instant Release" : "Linear Vesting"}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div style={{ marginBottom: 14 }}>
                    <h4
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        margin: "0 0 6px",
                        color: "var(--text)",
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      {c.name}
                    </h4>
                    {c.description ? (
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          margin: 0,
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {c.description}
                      </p>
                    ) : (
                      <p style={{ fontSize: 12, color: "var(--muted-2, #666)", margin: 0, fontStyle: "italic" }}>
                        No description provided
                      </p>
                    )}
                  </div>

                  {/* Allocation Info Box */}
                  {hasAllocation && (
                    <div
                      style={{
                        background: isClaimed ? "var(--surface)" : "rgba(184, 243, 107, 0.08)",
                        border: `1px solid ${isClaimed ? "var(--border)" : "rgba(184, 243, 107, 0.25)"}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Your Allocation:</span>
                      <strong className="mono" style={{ fontSize: 13, color: isClaimed ? "var(--muted)" : "var(--accent)" }}>
                        {Number(c.userAllocation?.amount).toLocaleString()} {c.tokenSymbol}
                      </strong>
                    </div>
                  )}

                  {/* Campaign Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      fontSize: 11,
                      color: "var(--muted)",
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <span>Total Recipients:</span>
                      <strong style={{ display: "block", color: "var(--text)", marginTop: 2 }}>
                        {c.totalRecipients} Wallets
                      </strong>
                    </div>
                    <div>
                      <span>Claimed:</span>
                      <strong style={{ display: "block", color: "var(--text)", marginTop: 2 }}>
                        {c.claimedCount} / {c.totalRecipients}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div style={{ marginTop: 16 }}>
                  {!isConnected ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleConnectWallet}
                      style={{
                        width: "100%",
                        height: 38,
                        fontSize: 12,
                        borderColor: "var(--border)",
                      }}
                    >
                      Connect Wallet to Claim
                    </button>
                  ) : isEligibleToClaim ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setSelectedClaimCampaign(c)}
                      style={{ width: "100%", height: 38, fontSize: 13, fontWeight: 600 }}
                    >
                      Claim {Number(c.userAllocation?.amount).toLocaleString()} {c.tokenSymbol}
                    </button>
                  ) : isClaimed ? (
                    <div
                      style={{
                        width: "100%",
                        height: 36,
                        borderRadius: 8,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "var(--muted)",
                        gap: 6,
                      }}
                    >
                      <svg className="icon" style={{ width: 14, height: 14, color: "var(--accent)" }}><use href="#i-check" /></svg>
                      Already Claimed
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 36,
                        borderRadius: 8,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      Not In Recipient List
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      By <span className="mono" style={{ color: "var(--text-2)" }}>{c.creator.slice(0, 6)}…{c.creator.slice(-4)}</span>
                    </span>
                    <AirdropShareButton
                      airdrop={{
                        campaignId: c.campaignId,
                        name: c.name,
                        token: c.token,
                        tokenSymbol: c.tokenSymbol,
                        totalAllocated: c.totalAmount,
                        totalRecipients: c.totalRecipients,
                        mode: c.mode,
                        vestingDays: c.vestingDuration ? Math.round(Number(c.vestingDuration) / 86400) : 30,
                        chainId: c.chainId || robinhoodMainnet.id,
                        txHash: c.txHash || undefined,
                      }}
                      className="btn btn-ghost btn-sm"
                      label="Share"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      <CreateAirdropModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchCampaigns();
          setActiveTab("created");
        }}
      />

      <ClaimModal
        open={Boolean(selectedClaimCampaign)}
        campaign={selectedClaimCampaign}
        onClose={() => setSelectedClaimCampaign(null)}
        onSuccess={() => {
          fetchCampaigns();
        }}
      />
    </main>
  );
}
