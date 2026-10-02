"use client";

import { useState } from "react";

const DAM_CA = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4";
const PUMP_FUN_URL = `https://pump.fun/coin/${DAM_CA}`;

export function DamCaBadge() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DAM_CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="hero-ca-pill" title="$DAM Contract Address on Robinhood Chain">
      <span className="hero-ca-pill-label">
        <span className="status-dot live" />
        $DAM CA
      </span>
      <code className="hero-ca-pill-addr" title={DAM_CA}>
        {DAM_CA.slice(0, 6)}...{DAM_CA.slice(-4)}
      </code>
      <div className="hero-ca-pill-actions">
        <button
          type="button"
          onClick={handleCopy}
          className="hero-ca-pill-btn"
          aria-label="Copy $DAM token contract address"
          title="Copy CA"
        >
          <svg className="icon" aria-hidden="true" style={{ width: 12, height: 12 }}>
            <use href="#i-copy" />
          </svg>
          {copied && <span className="hero-ca-pill-tip">Copied!</span>}
        </button>
        <a
          href={PUMP_FUN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hero-ca-pill-link"
          title="Trade $DAM on Pump.fun"
          aria-label="Open on Pump.fun"
        >
          <span>pump.fun</span>
          <svg className="icon" aria-hidden="true" style={{ width: 10, height: 10 }}>
            <use href="#i-up" />
          </svg>
        </a>
      </div>
    </div>
  );
}
