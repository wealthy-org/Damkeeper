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
    <main className="wrap">
      {/* Hero section */}
      <section className="hero-banner" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <span className="pill" style={{ borderColor: "rgba(255, 122, 69, 0.4)", background: "rgba(255, 122, 69, 0.1)", color: "#ff7a45" }}>
            <span className="status-dot" style={{ background: "#ff7a45", boxShadow: "0 0 8px #ff7a45" }} />
            Proof of Supply Impact
          </span>
          <DamCaBadge />
        </div>
        <h1>Token Burn on Robinhood Chain</h1>
        <p>
          Permanently destroy circulating supply with verifiable on-chain proof. Reduce contract{" "}
          <code className="mono" style={{ color: "#ff7a45", fontSize: 13 }}>totalSupply</code> directly via{" "}
          <code className="mono" style={{ color: "#ff7a45", fontSize: 13 }}>burn()</code> or transfer to the canonical{" "}
          <code className="mono" style={{ color: "#ff7a45", fontSize: 13 }}>0x...dEaD</code> sink with transparent Blockscout verification.
        </p>
      </section>

      {/* Two-column layout: Form console + Educational & Proof details */}
      <div className="burn-layout-grid">
        <div className="burn-main-col">
          <div className="card burn-container-card">
            <div className="card-head" style={{ borderBottom: "1px solid var(--hair-2)", paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="burn-icon-box">
                  <svg className="icon" aria-hidden="true" style={{ width: 18, height: 18, color: "#ff7a45" }}>
                    <use href="#i-flame" />
                  </svg>
                </span>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>Execute Token Destruction</h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                    Select an asset, preview live supply reduction, and sign the burn transaction.
                  </p>
                </div>
              </div>
            </div>

            <BurnForm />
          </div>
        </div>

        <aside className="burn-side-col">
          {/* Proof of Supply Impact Card */}
          <div className="card burn-info-card">
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <svg className="icon" aria-hidden="true" style={{ color: "#ff7a45", width: 16, height: 16 }}>
                  <use href="#i-shield" />
                </svg>
                Why Proof of Impact Matters
              </h3>
            </div>
            <p style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.6, margin: "0 0 14px" }}>
              Unlike generic wallet burns designed simply to hide spam collectibles, Damkeeper provides <strong>cryptographic supply accounting</strong> on Robinhood Chain:
            </p>
            <ul className="burn-feature-list">
              <li>
                <strong style={{ color: "#ff7a45" }}>Native burn():</strong> If the token contract supports{" "}
                <code className="mono" style={{ fontSize: 11 }}>ERC20Burnable</code>, tokens are completely erased, reducing the contract&apos;s on-chain{" "}
                <code className="mono" style={{ fontSize: 11 }}>totalSupply</code>.
              </li>
              <li>
                <strong style={{ color: "#ff7a45" }}>Dead Address Sink:</strong> Standard ERC-20s without a native burn function are transferred to{" "}
                <code className="mono" style={{ fontSize: 10 }}>0x000...dEaD</code>, provably eliminating them from circulation.
              </li>
              <li>
                <strong style={{ color: "#ff7a45" }}>Shareable Proof Card:</strong> Generate an instant on-chain receipt with tx hash, percentage burned, and new supply metrics to share on X.
              </li>
            </ul>
          </div>

          {/* Official $DAM Token Card */}
          <div className="card burn-info-card">
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <svg className="icon" aria-hidden="true" style={{ color: "var(--accent)", width: 16, height: 16 }}>
                  <use href="#i-coins" />
                </svg>
                Official $DAM Token
              </h3>
            </div>
            <p style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.6, margin: "0 0 12px" }}>
              The native utility token for Damkeeper locks, vesting, and supply management. Fully compatible with native{" "}
              <code className="mono" style={{ fontSize: 11, color: "#ff7a45" }}>burn()</code>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="burn-token-spec">
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Contract Address</span>
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
                  style={{ fontSize: 11, padding: "4px 10px", flex: 1, justifyContent: "center" }}
                >
                  pump.fun <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
                </a>
                <a
                  href="https://robinhoodchain.blockscout.com/token/0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: "4px 10px", flex: 1, justifyContent: "center" }}
                >
                  Blockscout <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
