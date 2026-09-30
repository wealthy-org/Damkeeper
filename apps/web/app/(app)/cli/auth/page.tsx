"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";

export default function CliAuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0b110e" }} />}>
      <CliAuthContent />
    </Suspense>
  );
}

function CliAuthContent() {
  const searchParams = useSearchParams();
  const port = searchParams.get("port") ?? "3000";
  const pubkey = searchParams.get("pubkey");

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [status, setStatus] = useState<"idle" | "authorizing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAuthorize = async () => {
    if (!address) return;
    setStatus("authorizing");
    setErrorMessage(null);

    try {
      const message = `Authorize Damkeeper CLI on this device.\nCLI Signer: ${pubkey ?? "Unknown"}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const callbackUrl = `http://127.0.0.1:${port}/callback`;

      // Try sending payload to local CLI loopback server
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          signature,
          deviceAddress: pubkey,
        }),
      });

      setStatus("success");
    } catch (err) {
      // If direct POST fails (e.g. mixed content in some strict browsers), redirect fallback
      if (address) {
        window.location.href = `http://127.0.0.1:${port}/callback?address=${address}`;
        return;
      }
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to authorize CLI");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0b110e",
      color: "#e6ede8",
      fontFamily: "var(--font-sans, -apple-system, sans-serif)",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "460px",
        width: "100%",
        backgroundColor: "#111a15",
        border: "1px solid #1f2f26",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <span style={{
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
            color: "#b8f36b",
            background: "rgba(184, 243, 107, 0.1)",
            padding: "4px 10px",
            borderRadius: "100px",
            border: "1px solid rgba(184, 243, 107, 0.25)"
          }}>
            Damkeeper CLI
          </span>
          <span style={{ fontSize: "12px", color: "#6e8275" }}>·</span>
          <span style={{ fontSize: "12px", color: "#8ca094" }}>Robinhood Testnet (46630)</span>
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#fff", margin: "0 0 8px 0" }}>
          Authorize Terminal Device
        </h1>
        <p style={{ fontSize: "14px", color: "#8ca094", lineHeight: 1.5, margin: "0 0 24px 0" }}>
          Connect your <strong>Phantom</strong> or Web3 wallet to authorize your local Damkeeper CLI session.
        </p>

        {pubkey && (
          <div style={{
            backgroundColor: "#0d1410",
            border: "1px solid #1a2820",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "20px",
            fontSize: "13px"
          }}>
            <div style={{ color: "#6e8275", fontSize: "11px", marginBottom: "4px" }}>CLI DEVICE SIGNER</div>
            <div style={{ fontFamily: "var(--font-mono, monospace)", color: "#b8f36b", wordBreak: "break-all" }}>
              {pubkey}
            </div>
          </div>
        )}

        {status === "success" ? (
          <div style={{
            textAlign: "center",
            padding: "24px 16px",
            backgroundColor: "rgba(184, 243, 107, 0.05)",
            border: "1px solid rgba(184, 243, 107, 0.2)",
            borderRadius: "12px"
          }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>✓</div>
            <h3 style={{ fontSize: "16px", color: "#b8f36b", margin: "0 0 6px 0" }}>Terminal Authenticated!</h3>
            <p style={{ fontSize: "13px", color: "#8ca094", margin: 0 }}>
              Your wallet <strong>{address?.slice(0, 6)}…{address?.slice(-4)}</strong> has authorized this CLI session.
              <br />You can safely close this browser tab and return to your terminal.
            </p>
          </div>
        ) : (
          <div>
            {!isConnected ? (
              <button
                type="button"
                onClick={() => connect({ connector: injected() })}
                style={{
                  width: "100%",
                  padding: "14px",
                  backgroundColor: "#b8f36b",
                  color: "#0b110e",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "opacity 0.2s"
                }}
              >
                Connect Phantom / Injected Wallet
              </button>
            ) : (
              <div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  backgroundColor: "#0d1410",
                  border: "1px solid #1a2820",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "13px"
                }}>
                  <div>
                    <div style={{ color: "#6e8275", fontSize: "11px" }}>CONNECTED WALLET</div>
                    <div style={{ fontWeight: 600, color: "#fff", fontFamily: "var(--font-mono, monospace)" }}>
                      {address?.slice(0, 8)}…{address?.slice(-6)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => disconnect()}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#e26d6d",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: "4px 8px"
                    }}
                  >
                    Disconnect
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAuthorize}
                  disabled={status === "authorizing"}
                  style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor: "#b8f36b",
                    color: "#0b110e",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "15px",
                    cursor: status === "authorizing" ? "wait" : "pointer",
                    opacity: status === "authorizing" ? 0.7 : 1
                  }}
                >
                  {status === "authorizing" ? "Authorizing via Phantom…" : "Authorize & Activate Terminal Access"}
                </button>
              </div>
            )}

            {errorMessage && (
              <div style={{ marginTop: "14px", fontSize: "13px", color: "#e26d6d", textAlign: "center" }}>
                ✗ {errorMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
