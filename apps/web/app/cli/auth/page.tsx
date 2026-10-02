"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { Providers } from "@/app/(app)/providers";

export default function CliAuthPage() {
  return (
    <Providers>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#080c0a" }} />}>
        <CliAuthContent />
      </Suspense>
    </Providers>
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
      const message = `Authorize Damkeeper CLI on this device.\nDevice Signer: ${pubkey ?? "Unknown"}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const callbackUrl = `http://127.0.0.1:${port}/callback`;

      try {
        await fetch(callbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            signature,
            deviceAddress: pubkey,
          }),
        });
      } catch {
        // Fallback for strict browser network isolation
        window.location.href = `http://127.0.0.1:${port}/callback?address=${address}&signature=${signature}`;
        return;
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to authorize CLI session.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#070a08",
      backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(184, 243, 107, 0.08), transparent)",
      color: "#e6ede8",
      fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "24px"
    }}>
      <div style={{
        maxWidth: "520px",
        width: "100%",
        backgroundColor: "#0d1410",
        border: "1px solid #1a2820",
        borderRadius: "20px",
        padding: "36px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Subtle top glow line */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, #b8f36b, transparent)",
          opacity: 0.8
        }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
              color: "#b8f36b",
              background: "rgba(184, 243, 107, 0.12)",
              padding: "4px 10px",
              borderRadius: "100px",
              border: "1px solid rgba(184, 243, 107, 0.25)"
            }}>
              DAMKEEPER CLI
            </span>
            <span style={{ fontSize: "12px", color: "#4d6154" }}>·</span>
            <span style={{ fontSize: "12px", color: "#8ca094", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#b8f36b", display: "inline-block" }} />
              Robinhood Chain (4663)
            </span>
          </div>

          <span style={{ fontSize: "11px", color: "#6e8275", fontFamily: "var(--font-mono, monospace)" }}>
            PORT {port}
          </span>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#fff", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
          Authorize Terminal Session
        </h1>
        <p style={{ fontSize: "14px", color: "#8ca094", lineHeight: 1.6, margin: "0 0 28px 0" }}>
          Link your <strong>Phantom</strong> or Web3 wallet with your local terminal. Once authorized, you can manage token locks and vesting directly from your command line.
        </p>

        {pubkey && (
          <div style={{
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            border: "1px solid #16241b",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "24px",
          }}>
            <div style={{ color: "#6e8275", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              LOCAL DEVICE SIGNER
            </div>
            <div style={{ fontFamily: "var(--font-mono, monospace)", color: "#b8f36b", fontSize: "13px", wordBreak: "break-all" }}>
              {pubkey}
            </div>
          </div>
        )}

        {status === "success" ? (
          <div style={{
            textAlign: "center",
            padding: "36px 24px",
            backgroundColor: "rgba(184, 243, 107, 0.06)",
            border: "1px solid rgba(184, 243, 107, 0.3)",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(184, 243, 107, 0.08)"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(184, 243, 107, 0.15)",
              color: "#b8f36b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              margin: "0 auto 18px auto",
              border: "1px solid rgba(184, 243, 107, 0.35)",
              boxShadow: "0 0 20px rgba(184, 243, 107, 0.2)"
            }}>
              ✓
            </div>
            <h3 style={{ fontSize: "20px", color: "#b8f36b", margin: "0 0 8px 0", fontWeight: 600, letterSpacing: "-0.01em" }}>
              Authentication Successful!
            </h3>
            <p style={{ fontSize: "14px", color: "#9da3ae", margin: "0 0 20px 0", lineHeight: 1.5 }}>
              Wallet <strong style={{ color: "#fff", fontFamily: "var(--font-mono, monospace)" }}>{address?.slice(0, 6)}…{address?.slice(-4)}</strong> has authorized this CLI session.
            </p>
            <div style={{
              background: "rgba(184, 243, 107, 0.08)",
              border: "1px solid rgba(184, 243, 107, 0.25)",
              padding: "12px 16px",
              borderRadius: "10px",
              color: "#b8f36b",
              fontWeight: 500,
              fontSize: "13px",
              letterSpacing: "0.01em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "16px"
            }}>
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#b8f36b",
                boxShadow: "0 0 8px #b8f36b",
                display: "inline-block"
              }} />
              <span>Please check your CLI terminal now.</span>
            </div>
            <div style={{ fontSize: "12px", color: "#6e8275" }}>
              You can now safely close this browser window.
            </div>
          </div>
        ) : (
          <div>
            {!isConnected ? (
              <button
                type="button"
                onClick={() => connect({ connector: injected() })}
                style={{
                  width: "100%",
                  padding: "16px",
                  backgroundColor: "#b8f36b",
                  color: "#070a08",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "transform 0.15s, opacity 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: "0 4px 20px rgba(184, 243, 107, 0.25)"
                }}
              >
                <span>Connect Phantom / Web3 Wallet</span>
              </button>
            ) : (
              <div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  backgroundColor: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid #16241b",
                  borderRadius: "12px",
                  marginBottom: "20px",
                }}>
                  <div>
                    <div style={{ color: "#6e8275", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>
                      AUTHORIZED WALLET
                    </div>
                    <div style={{ fontWeight: 600, color: "#fff", fontFamily: "var(--font-mono, monospace)", fontSize: "14px" }}>
                      {address?.slice(0, 8)}…{address?.slice(-6)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => disconnect()}
                    style={{
                      background: "rgba(226, 109, 109, 0.1)",
                      border: "1px solid rgba(226, 109, 109, 0.2)",
                      color: "#e26d6d",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: "6px 12px",
                      transition: "all 0.15s"
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
                    padding: "16px",
                    backgroundColor: "#b8f36b",
                    color: "#070a08",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "15px",
                    cursor: status === "authorizing" ? "wait" : "pointer",
                    opacity: status === "authorizing" ? 0.75 : 1,
                    boxShadow: "0 4px 20px rgba(184, 243, 107, 0.25)",
                    transition: "all 0.15s"
                  }}
                >
                  {status === "authorizing" ? "Approving in Phantom…" : "Authorize & Activate Terminal Access"}
                </button>
              </div>
            )}

            {errorMessage && (
              <div style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "rgba(226, 109, 109, 0.1)",
                border: "1px solid rgba(226, 109, 109, 0.2)",
                fontSize: "13px",
                color: "#e26d6d",
                textAlign: "center"
              }}>
                ✗ {errorMessage}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #141f17", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#526357" }}>
            Secured via EIP-191 Local Signer
          </span>
          <span style={{ fontSize: "12px", color: "#526357" }}>
            Damkeeper Protocol
          </span>
        </div>
      </div>
    </div>
  );
}
