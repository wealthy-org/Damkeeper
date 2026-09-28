"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { PositionRow, type ApiPosition } from "./position-row";
import { FaucetButton } from "./faucet-button";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/positions?wallet=${address}`)
      .then((r) => r.json())
      .then((data) => setPositions(data.positions ?? []))
      .catch(() => setPositions([]))
      .finally(() => setLoading(false));
  }, [address]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          Dashboard
        </div>
        <h1>Your positions</h1>
        <p className="page-lede">
          Locks and vesting schedules where your connected wallet is the creator or the
          beneficiary — read straight from indexed contract state.
        </p>
      </div>

      {!isConnected ? (
        <div className="stage">
          <div className="card edge float empty-hero" style={{ maxWidth: 520, marginInline: "auto" }}>
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true"><use href="#i-wallet" /></svg>
            </span>
            <h2>No wallet connected</h2>
            <p>
              Connect a wallet to see the locks and vesting schedules tied to your address.
              Reading a public proof page never requires a wallet — this is only for your
              personal view.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 4 }}
              disabled={isPending}
              onClick={() => connect({ connector: connectors[0] })}
            >
              {isPending ? "Connecting…" : "Connect wallet"}
              <svg className="icon" aria-hidden="true"><use href="#i-arrow" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <FaucetButton address={address as `0x${string}`} />
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/lock/new" className="btn btn-ghost">
                <svg className="icon" aria-hidden="true"><use href="#i-lock" /></svg>
                Create lock
              </a>
              <a href="/vesting/new" className="btn btn-ghost">
                <svg className="icon" aria-hidden="true"><use href="#i-chart" /></svg>
                Create vesting
              </a>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-cell">
              <span>Wallet</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <strong className="mono" style={{ fontSize: 13 }}>{address?.slice(0, 6)}…{address?.slice(-4)}</strong>
                <button
                  onClick={() => disconnect()}
                  style={{ background: "none", fontSize: 10, color: "var(--faint)", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  Disconnect
                </button>
              </div>
            </div>
            <div className="stat-cell accent">
              <span>Total positions</span>
              <strong>{positions.length}</strong>
            </div>
            <div className="stat-cell">
              <span>Network</span>
              <strong style={{ fontSize: 14 }}>Robinhood Testnet</strong>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Positions</h2>
              {loading && <span style={{ fontSize: 11, color: "var(--muted)" }}>Loading…</span>}
            </div>
            {!loading && positions.length === 0 ? (
              <div className="empty-hero">
                <span className="ic">
                  <svg className="icon-lg" aria-hidden="true"><use href="#i-layers" /></svg>
                </span>
                <h2>Nothing here yet</h2>
                <p>
                  No lock or vesting schedule references this wallet as creator or beneficiary.
                  Once you create one, or someone names this address as a beneficiary, it shows
                  up here.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Manager</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <PositionRow
                      key={`${p.chainId}-${p.manager}-${p.positionId}`}
                      position={p}
                      wallet={address as `0x${string}`}
                      onSettled={reload}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
