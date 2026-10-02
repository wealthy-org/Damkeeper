import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getPosition } from "@/lib/positions-query";
import { formatAmount, tokenLabel, statusOf, STATUS_LABEL } from "@/lib/position-view";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get("chainId");
    const managerParam = searchParams.get("manager");
    const idParam = searchParams.get("id");

    let title = "Damkeeper Protocol";
    let subtitle = "Token locks and linear vesting on Robinhood Chain";
    let amount = "";
    let token = "";
    let statusText = "Onchain Proof";
    let positionKind = "Token Vault";
    let netName = "Robinhood Chain Mainnet";

    if (chainIdParam && managerParam && idParam) {
      const chainId = Number(chainIdParam);
      const positionId = BigInt(idParam);
      const pos = await getPosition(chainId, managerParam.toLowerCase(), positionId);

      if (pos) {
        amount = formatAmount(pos);
        token = tokenLabel(pos);
        positionKind = pos.kind === "lock" ? `Token Lock #${pos.positionId}` : `Vesting Schedule #${pos.positionId}`;
        const st = statusOf(pos);
        statusText = STATUS_LABEL[st];
        title = `${amount} ${token}`;
        subtitle = pos.kind === "lock" 
          ? `Locked until ${pos.unlockTime ? new Date(Number(pos.unlockTime) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "unlock date"}`
          : `Linear vesting from ${pos.startTime ? new Date(Number(pos.startTime) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "start"}`;
        netName = chainId === 4663 ? "Robinhood Chain (4663)" : "Robinhood Testnet (46630)";
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#0b110e",
            backgroundImage: "radial-gradient(circle at 25px 25px, #17221b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #17221b 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            padding: "60px 80px",
            fontFamily: "sans-serif",
            color: "#f2f5ee",
          }}
        >
          {/* Top Row: Brand & Network Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "#b8f36b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0b110e",
                  fontWeight: "bold",
                  fontSize: "24px",
                }}
              >
                DK
              </div>
              <div style={{ fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>
                Damkeeper
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "999px",
                backgroundColor: "rgba(184, 243, 107, 0.1)",
                border: "1px solid rgba(184, 243, 107, 0.25)",
                fontSize: "16px",
                color: "#b8f36b",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#b8f36b",
                }}
              />
              {netName}
            </div>
          </div>

          {/* Center Card: Main Information */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "40px",
              backgroundColor: "rgba(17, 26, 20, 0.8)",
              borderRadius: "20px",
              border: "1px solid rgba(226, 240, 220, 0.12)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", color: "#95a595", textTransform: "uppercase", letterSpacing: "1px" }}>
                {positionKind}
              </span>
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#b8f36b",
                }}
              >
                {statusText}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
              <span style={{ fontSize: "64px", fontWeight: "800", color: "#f2f5ee", letterSpacing: "-1.5px" }}>
                {title}
              </span>
            </div>

            <div style={{ fontSize: "22px", color: "#aab8aa" }}>
              {subtitle}
            </div>
          </div>

          {/* Bottom Row: Trust & Verified Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#819181", fontSize: "16px" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              <span>✓ Cryptographically Anchored</span>
              <span>✓ Non-Custodial Vault</span>
              <span>✓ Blockscout Verified</span>
            </div>
            <div style={{ color: "#b8f36b", fontWeight: "600" }}>
              damkeeper.xyz
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
