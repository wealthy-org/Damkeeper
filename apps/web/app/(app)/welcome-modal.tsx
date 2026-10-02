"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useConnect } from "wagmi";

const FOREVER_KEY = "dk-welcome-dismissed";
const SESSION_KEY = "dk-welcome-closed";

function readFlag(storage: () => Storage, key: string) {
  try {
    return storage().getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(storage: () => Storage, key: string) {
  try {
    storage().setItem(key, "1");
  } catch {
    // Storage blocked (private mode, etc.) — the modal just shows again next time.
  }
}

export function WelcomeModal() {
  const { status } = useAccount();
  const { connect, connectors } = useConnect();
  const params = useSearchParams();
  const creating = params.has("create");
  const ref = useRef<HTMLDialogElement>(null);
  const [neverAgain, setNeverAgain] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(readFlag(() => localStorage, FOREVER_KEY) || readFlag(() => sessionStorage, SESSION_KEY));
  }, []);

  // Wait a beat before opening: a returning wallet reconnects right after
  // hydration, and it shouldn't see a "connect your wallet" welcome flash by.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (dismissed || creating || status !== "disconnected") {
      if (dialog.open) dialog.close();
      return;
    }
    const t = setTimeout(() => {
      if (!dialog.open) dialog.showModal();
    }, 700);
    return () => clearTimeout(t);
  }, [dismissed, creating, status]);

  function close() {
    if (neverAgain) writeFlag(() => localStorage, FOREVER_KEY);
    writeFlag(() => sessionStorage, SESSION_KEY);
    setDismissed(true);
  }

  return (
    <dialog
      ref={ref}
      className="modal welcome"
      aria-labelledby="welcome-title"
      onClose={() => !dismissed && close()}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="wl-art" aria-hidden="true">
        <span className="wl-ring r1" />
        <span className="wl-ring r2" />
        <span className="wl-ring r3" />
        <div className="wl-pill">
          <span className="wl-ic"><svg className="icon-lg"><use href="#i-clock" /></svg></span>
          <span className="wl-ic"><svg className="icon-lg"><use href="#i-lock" /></svg></span>
          <span className="wl-brand">
            <img src="/logo-symbol.png" alt="" width={56} height={56} />
          </span>
          <span className="wl-ic"><svg className="icon-lg"><use href="#i-chart" /></svg></span>
          <span className="wl-ic"><svg className="icon-lg"><use href="#i-shield" /></svg></span>
        </div>
        <button type="button" className="wl-x" aria-label="Close" onClick={close}>
          <svg className="icon"><use href="#i-close" /></svg>
        </button>
      </div>

      <div className="wl-body">
        <span className="pill">
          <span className="status-dot live" />
          Robinhood Chain Mainnet
        </span>
        <h2 id="welcome-title">Welcome to Damkeeper</h2>
        <p>
          Lock token allocations and set vesting schedules, each with a public proof page anyone
          can check. Connect a wallet to create and manage positions. Browsing never needs one.
        </p>
      </div>

      <div className="wl-foot">
        <label className="wl-check">
          <input type="checkbox" checked={neverAgain} onChange={(e) => setNeverAgain(e.target.checked)} />
          Don&apos;t show this again
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={close}>Close</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              close();
              connect({ connector: connectors[0] });
            }}
          >
            Connect wallet
          </button>
        </div>
      </div>
    </dialog>
  );
}
