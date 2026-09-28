"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { PositionRow, type ApiPosition } from "./position-row";

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
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No wallet connected</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: 420 }}>
              Connect a wallet to see the locks and vesting schedules tied to your address. Reading
              a public proof page never requires a wallet — this is only for your personal view.
            </p>
          </div>
          <button
            className="btn btn-primary"
            disabled={isPending}
            onClick={() => connect({ connector: connectors[0] })}
          >
            {isPending ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="status-dot live" />
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)" }}>{address}</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/lock/new" className="btn btn-ghost">Create lock</a>
              <a href="/vesting/new" className="btn btn-ghost">Create vesting</a>
              <button className="btn btn-ghost" onClick={() => disconnect()}>Disconnect</button>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Positions</h2>
              {loading && <span style={{ fontSize: 11, color: "var(--muted)" }}>Loading…</span>}
            </div>
            {!loading && positions.length === 0 ? (
              <div className="empty-state">
                <strong>Nothing here yet</strong>
                <p>
                  No lock or vesting schedule references this wallet as creator or beneficiary. Once
                  you create one, or someone names this address as a beneficiary, it shows up here.
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
