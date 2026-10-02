import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getPosition } from "@/lib/positions-query";
import {
  durationLabel,
  formatAmount,
  releaseAt,
  shortAddress,
  statusOf,
  STATUS_LABEL,
  tokenLabel,
} from "@/lib/position-view";

export const runtime = "nodejs";

const cardDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function getAssetDataUri(filename: string): string {
  try {
    const possiblePaths = [
      path.join(process.cwd(), "public", filename),
      path.join(process.cwd(), "apps/web/public", filename),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
      }
    }
  } catch {}
  return `https://www.damkeeper.xyz/${filename}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get("chainId");
    const managerParam = searchParams.get("manager");
    const idParam = searchParams.get("id");

    const wordmarkUri = getAssetDataUri("logo-wordmark.png");
    const symbolUri = getAssetDataUri("logo-symbol.png");

    let kindEyebrow = "T O K E N   L O C K S   &   V E S T I N G";
    let label = "Robinhood Chain Protocol";
    let amount = "Damkeeper";
    let symbol = "Protocol";
    let tokenSubtitle = "Non-custodial smart contracts · verified onchain";
    let unlocksLabel = "SECURITY";
    let unlocksValue = "Non-Custodial";
    let durationValue = "Verifiable";
    let statusValue = "MAINNET ACTIVE";
    let statusColor = "#b8f36b";
    let netPosition = "ROBINHOOD CHAIN (4663)";
    let proofShortUrl = "www.damkeeper.xyz";

    if (chainIdParam && managerParam && idParam) {
      const chainId = Number(chainIdParam);
      const positionId = BigInt(idParam);
      const pos = await getPosition(chainId, managerParam.toLowerCase(), positionId);

      if (pos) {
        kindEyebrow = pos.kind === "lock" ? "T O K E N   L O C K" : "L I N E A R   V E S T I N G";
        label = pos.label ?? `${tokenLabel(pos)} ${pos.kind === "lock" ? "Lock" : "Vesting Schedule"}`;
        amount = formatAmount(pos, pos.amount, 2);
        symbol = tokenLabel(pos);
        tokenSubtitle = `${pos.tokenName ?? "ERC-20"} · ${shortAddress(pos.token)}`;

        const release = releaseAt(pos);
        unlocksLabel = pos.kind === "lock" ? "UNLOCKS" : "FULLY VESTED";
        unlocksValue = release ? cardDate(release) : "—";
        durationValue = durationLabel(pos);

        const st = statusOf(pos);
        statusValue = STATUS_LABEL[st].toUpperCase();
        statusColor = st === "withdrawn" || st === "fully_claimed" ? "#95a595" : "#b8f36b";

        const netLabel = chainId === 46630 ? "ROBINHOOD CHAIN TESTNET" : "ROBINHOOD CHAIN";
        netPosition = `${netLabel} · #${pos.positionId}`;
        proofShortUrl = `www.damkeeper.xyz/positions/${chainId}/${shortAddress(pos.manager)}/${pos.positionId}`;
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            backgroundColor: "#070b09",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "sans-serif",
            color: "#f2f5ee",
          }}
        >
          {/* Inner Card matching the Share Modal Preview */}
          <div
            style={{
              width: "1152px",
              height: "582px",
              borderRadius: "24px",
              border: "1px solid rgba(226, 240, 220, 0.14)",
              backgroundColor: "#0b110e",
              backgroundImage:
                "radial-gradient(circle at 82% 18%, rgba(184, 243, 107, 0.16) 0%, rgba(11, 17, 14, 0) 65%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "36px 48px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Watermark Logo Symbol */}
            {symbolUri ? (
              <img
                src={symbolUri}
                alt=""
                style={{
                  position: "absolute",
                  right: "-20px",
                  bottom: "-40px",
                  width: "520px",
                  height: "520px",
                  opacity: "0.07",
                }}
              />
            ) : null}

            {/* Top Row: Wordmark & Network info */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                zIndex: 1,
              }}
            >
              {wordmarkUri ? (
                <img
                  src={wordmarkUri}
                  alt="Damkeeper"
                  style={{
                    height: "38px",
                    width: "173px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#b8f36b" }}>Damkeeper</span>
                </div>
              )}

              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "16px",
                  color: "#819181",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                {netPosition}
              </div>
            </div>

            {/* Middle Section: Eyebrow, Label, Amount + Symbol, Token details */}
            <div style={{ display: "flex", flexDirection: "column", zIndex: 1 }}>
              <div
                style={{
                  fontSize: "16px",
                  fontFamily: "monospace",
                  color: "#b8f36b",
                  fontWeight: "600",
                  letterSpacing: "5px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                {kindEyebrow}
              </div>

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "500",
                  color: "#d1dacf",
                  marginBottom: "12px",
                }}
              >
                {label}
              </div>

              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span
                  style={{
                    fontSize: "76px",
                    fontWeight: "800",
                    color: "#f2f5ee",
                    letterSpacing: "-2px",
                    lineHeight: "1",
                  }}
                >
                  {amount}
                </span>
                <span
                  style={{
                    fontSize: "76px",
                    fontWeight: "800",
                    color: "#b8f36b",
                    letterSpacing: "-1px",
                    lineHeight: "1",
                    marginLeft: "18px",
                  }}
                >
                  {symbol}
                </span>
              </div>

              <div
                style={{
                  fontSize: "17px",
                  color: "#95a595",
                  marginTop: "10px",
                }}
              >
                {tokenSubtitle}
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                width: "100%",
                height: "1px",
                borderBottom: "1px solid rgba(226, 240, 220, 0.14)",
                margin: "18px 0 16px 0",
                zIndex: 1,
              }}
            />

            {/* Bottom Row: 3 Facts & Monospace Footer Links */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                width: "100%",
                zIndex: 1,
              }}
            >
              {/* Facts Columns */}
              <div style={{ display: "flex" }}>
                <div style={{ display: "flex", flexDirection: "column", width: "260px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontFamily: "monospace",
                      color: "#819181",
                      letterSpacing: "2px",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    {unlocksLabel}
                  </span>
                  <span style={{ fontSize: "22px", fontWeight: "600", color: "#f2f5ee" }}>
                    {unlocksValue}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", width: "200px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontFamily: "monospace",
                      color: "#819181",
                      letterSpacing: "2px",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    DURATION
                  </span>
                  <span style={{ fontSize: "22px", fontWeight: "600", color: "#f2f5ee" }}>
                    {durationValue}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", width: "220px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontFamily: "monospace",
                      color: "#819181",
                      letterSpacing: "2px",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    STATUS
                  </span>
                  <span style={{ fontSize: "22px", fontWeight: "700", color: statusColor, textTransform: "uppercase" }}>
                    {statusValue}
                  </span>
                </div>
              </div>

              {/* Sub-footer text */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "13px",
                    fontFamily: "monospace",
                    color: "#819181",
                    marginBottom: "3px",
                  }}
                >
                  Non-custodial · verifiable onchain
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontFamily: "monospace",
                    color: "#b8f36b",
                  }}
                >
                  {proofShortUrl}
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (e: unknown) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
