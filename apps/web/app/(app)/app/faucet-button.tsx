"use client";

import { useState } from "react";

export function FaucetButton({ address }: { address: `0x${string}` }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const claim = async () => {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "Faucet request failed.");
        return;
      }
      setState("done");
      setMessage(`Sent ${data.amount} EXMPL. Tx: ${data.txHash.slice(0, 10)}…`);
    } catch {
      setState("error");
      setMessage("Network error — try again.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button className="btn btn-ghost" onClick={claim} disabled={state === "loading"}>
        <svg className="icon" aria-hidden="true"><use href="#i-link" /></svg>
        {state === "loading" ? "Requesting…" : "Get test tokens"}
      </button>
      {message && (
        <span style={{ fontSize: 11, color: state === "error" ? "var(--danger)" : "var(--accent)", maxWidth: 260, textAlign: "right" }}>
          {message}
        </span>
      )}
    </div>
  );
}
