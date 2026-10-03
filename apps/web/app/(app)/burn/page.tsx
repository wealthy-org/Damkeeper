import type { Metadata } from "next";
import Link from "next/link";
import { BurnForm } from "./burn-form";
import { DamCaBadge } from "../dam-ca-badge";

export const metadata: Metadata = {
  title: "Token Burn · Damkeeper",
  description: "Permanently destroy ERC-20 token supply with verifiable on-chain proof on Robinhood Chain Mainnet.",
};

export default function BurnPage() {
  return (
    <main className="wrap burn-page-wrapper">
      {/* Hero section */}
      <section className="hero-banner" style={{ textAlign: "center", marginBottom: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
          <span className="pill" style={{ borderColor: "rgba(255, 122, 69, 0.4)", background: "rgba(255, 122, 69, 0.1)", color: "#ff7a45" }}>
            <span className="status-dot" style={{ background: "#ff7a45", boxShadow: "0 0 8px #ff7a45" }} />
            Proof of Supply Impact
          </span>
          <DamCaBadge />
        </div>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", margin: "0 0 8px" }}>Token Burn</h1>
        <p style={{ maxWidth: 540, margin: "0 auto", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          Permanently destroy circulating supply with verifiable on-chain proof. Reduce contract{" "}
          <code className="mono" style={{ color: "#ff7a45", fontSize: 12 }}>totalSupply</code> directly via{" "}
          <code className="mono" style={{ color: "#ff7a45", fontSize: 12 }}>burn()</code> or transfer to the canonical{" "}
          <code className="mono" style={{ color: "#ff7a45", fontSize: 12 }}>0x...dEaD</code> sink.
        </p>
      </section>

      {/* Main Terminal Card */}
      <div className="card burn-container-card">
        <div className="card-head" style={{ borderBottom: "1px solid var(--hair-2)", paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="burn-icon-box">
              <svg className="icon" aria-hidden="true" style={{ width: 18, height: 18, color: "#ff7a45" }}>
                <use href="#i-flame" />
              </svg>
            </span>
            <div>
              <h2 style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>Execute Token Destruction</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Enter burn amount, preview supply contraction, and sign on Robinhood Chain.
              </p>
            </div>
          </div>
        </div>

        <BurnForm />
      </div>

      {/* Supporting Information Cards below Console */}
      <div className="burn-info-grid">
        {/* Proof of Supply Impact Card */}
        <div className="card burn-info-card">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <svg className="icon" aria-hidden="true" style={{ color: "#ff7a45", width: 15, height: 15 }}>
                <use href="#i-shield" />
              </svg>
              Why Proof of Impact Matters
            </h3>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--body)", lineHeight: 1.5, margin: "0 0 10px" }}>
            Unlike generic burns that simply hide spam tokens, Damkeeper provides <strong>verifiable cryptographic accounting</strong>:
          </p>
          <ul className="burn-feature-list" style={{ fontSize: 11 }}>
            <li>
              <strong style={{ color: "#ff7a45" }}>Native burn():</strong> Directly calls contract{" "}
              <code className="mono" style={{ fontSize: 10 }}>burn()</code> to erase tokens from <code className="mono" style={{ fontSize: 10 }}>totalSupply</code>.
            </li>
            <li>
              <strong style={{ color: "#ff7a45" }}>Dead Sink:</strong> Standard ERC-20s transfer to{" "}
              <code className="mono" style={{ fontSize: 10 }}>0x...dEaD</code>, provably removing them from circulation.
            </li>
            <li>
              <strong style={{ color: "#ff7a45" }}>Shareable Proof:</strong> Instant on-chain receipt with tx hash and contraction metrics.
            </li>
          </ul>
        </div>

        {/* Official $DAM Token Card */}
        <div className="card burn-info-card">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <svg className="icon" aria-hidden="true" style={{ color: "var(--accent)", width: 15, height: 15 }}>
                <use href="#i-coins" />
              </svg>
              Official $DAM Token
            </h3>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--body)", lineHeight: 1.5, margin: "0 0 10px" }}>
            Utility token for Damkeeper locks, vesting, and supply management. Fully compatible with native <code className="mono" style={{ fontSize: 10, color: "#ff7a45" }}>burn()</code>.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="burn-token-spec">
              <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Contract Address</span>
              <code className="mono" style={{ fontSize: 11, color: "var(--accent)", wordBreak: "break-all" }}>
                0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4
              </code>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <a
                href="https://pump.fun/coin/0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: "4px 8px", flex: 1, justifyContent: "center" }}
              >
                pump.fun <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
              </a>
              <a
                href="https://robinhoodchain.blockscout.com/token/0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: "4px 8px", flex: 1, justifyContent: "center" }}
              >
                Blockscout <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
