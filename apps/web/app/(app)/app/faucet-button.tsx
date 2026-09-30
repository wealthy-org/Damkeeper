"use client";

import { useState } from "react";
import { useAccount, useConnect } from "wagmi";

export function FaucetCard() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const claim = async () => {
    if (!isConnected || !address) {
      connect({ connector: connectors[0] });
      return;
    }
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
      setMessage(`Sent ${data.amount} EXMPL · ${data.txHash.slice(0, 10)}…`);
    } catch {
      setState("error");
      setMessage("Network error. Try again.");
    }
  };

  const hint = message ?? (isConnected ? "1,000 EXMPL, once every 24 hours" : "Connect a wallet to claim");

  return (
    <button className="try-card" onClick={claim} disabled={state === "loading"}>
      <svg className="icon" aria-hidden="true"><use href="#i-drop" /></svg>
      <span>
        {state === "loading" ? "Sending test tokens…" : "Get test tokens"}
        <small style={{ color: state === "error" ? "var(--danger)" : state === "done" ? "var(--accent)" : undefined }}>
          {hint}
        </small>
      </span>
    </button>
  );
}
