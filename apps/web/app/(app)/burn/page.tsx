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
      {/* Standard hero banner matching other Damkeeper pages */}
      <section className="hero-banner">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <span className="pill">
            <span className="status-dot live" />
            Proof of Supply Impact
          </span>
          <DamCaBadge />
        </div>
        <h1>Token Burn on Robinhood Chain</h1>
        <p>
          Permanently destroy circulating supply with verifiable on-chain proof. Reduce contract{" "}
          <code className="mono">totalSupply</code> directly via{" "}
          <code className="mono">burn()</code> or transfer to the canonical{" "}
          <code className="mono">0x...dEaD</code> sink with transparent Blockscout verification.
        </p>
      </section>

      {/* 2-column split grid matching Damkeeper form/info layouts */}
      <div className="burn-split-grid">
        {/* Main Burn Form Card */}
        <section className="card">
          <div className="card-head" style={{ borderBottom: "1px solid var(--hair)", paddingBottom: 14, marginBottom: 18 }}>
            <h2 style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: 600 }}>
              <svg className="icon" style={{ color: "var(--accent)" }} aria-hidden="true">
                <use href="#i-flame" />
              </svg>
              Execute Token Destruction
            </h2>
          </div>
          <BurnForm />
        </section>

        {/* Sidebar Info Cards */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Why Proof of Impact Matters */}
          <section className="card">
            <div className="card-head" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <svg className="icon" style={{ color: "var(--accent)" }} aria-hidden="true">
                  <use href="#i-shield" />
                </svg>
                Why Proof of Impact Matters
              </h3>
            </div>
            <p style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.6, margin: "0 0 14px" }}>
              Unlike generic wallet burns designed simply to hide spam collectibles, Damkeeper provides <strong>cryptographic supply accounting</strong> on Robinhood Chain:
            </p>
            <ul className="check">
              <li>
                <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
                <span>
                  <strong style={{ color: "var(--text)" }}>Native burn():</strong> If supported, tokens are completely erased, reducing the contract&apos;s on-chain{" "}
                  <code className="mono" style={{ fontSize: 11 }}>totalSupply</code>.
                </span>
              </li>
              <li>
                <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
                <span>
                  <strong style={{ color: "var(--text)" }}>Dead Address Sink:</strong> Standard ERC-20s without a native burn function are transferred to{" "}
                  <code className="mono" style={{ fontSize: 11 }}>0x000...dEaD</code>, provably eliminating them from circulation.
                </span>
              </li>
              <li>
                <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
                <span>
                  <strong style={{ color: "var(--text)" }}>Shareable Proof Card:</strong> Generate an instant on-chain receipt with tx hash, percentage burned, and new supply metrics to share on X.
                </span>
              </li>
            </ul>
          </section>

          {/* Official $DAM Token Card */}
          <section className="card">
            <div className="card-head" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <svg className="icon" style={{ color: "var(--accent)" }} aria-hidden="true">
                  <use href="#i-coins" />
                </svg>
                Official $DAM Token
              </h3>
            </div>
            <p style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.6, margin: "0 0 14px" }}>
              The native utility token for Damkeeper locks, vesting, and supply management. Fully compatible with native{" "}
              <code className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>burn()</code>.
            </p>
            <div style={{ background: "var(--bg-deep)", border: "1px solid var(--hair-2)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contract Address</span>
              <code className="mono" style={{ fontSize: 11, color: "var(--accent)", wordBreak: "break-all" }}>
                0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4
              </code>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
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
          </section>
        </aside>
      </div>
    </main>
  );
}
