"use client";

import { useAccount, useConnect } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { PositionRow, type ApiPosition } from "./position-row";

export function YourPositions() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
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
    <section>
      <div className="section-title">
        <h2>Your positions</h2>
        {isConnected && (
          <span className="live-tag">
            {loading ? "Loading…" : `${positions.length} as creator or beneficiary`}
          </span>
        )}
      </div>

      <div className="card">
        {!isConnected ? (
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true"><use href="#i-wallet" /></svg>
            </span>
            <h2>No wallet connected</h2>
            <p>
              Connect a wallet to see the locks and vesting schedules where you&apos;re the creator
              or the beneficiary. Public proof pages never need a wallet.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 4 }}
              disabled={isPending}
              onClick={() => connect({ connector: connectors[0] })}
            >
              {isPending ? "Connecting…" : "Connect wallet"}
            </button>
          </div>
        ) : !loading && positions.length === 0 ? (
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true"><use href="#i-layers" /></svg>
            </span>
            <h2>Nothing here yet</h2>
            <p>
              No lock or vesting schedule names this wallet as creator or beneficiary. Create one
              above, and it shows up here once the indexer catches up.
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
      </div>
    </section>
  );
}
