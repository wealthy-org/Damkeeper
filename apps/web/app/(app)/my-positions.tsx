"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { lockManagerAbi, vestingManagerAbi } from "@/lib/abi";
import { useTxFlow, txStatusLabel } from "@/lib/use-tx-flow";
import { formatShort } from "@/lib/dates";
import {
  claimableOf,
  formatAmount,
  progressOf,
  proofPath,
  releaseAt,
  statusOf,
  STATUS_LABEL,
  tokenLabel,
  type PositionView,
} from "@/lib/position-view";
import { ShareButton } from "./share/share-button";

type Tab = "all" | "incoming" | "outgoing";

const TAB_LABEL: Record<Tab, string> = { all: "All", incoming: "Incoming", outgoing: "Outgoing" };
const TAB_HINT: Record<Tab, string> = {
  all: "",
  incoming: "You're the beneficiary",
  outgoing: "You created it",
};

export function MyPositions({ kind }: { kind?: "lock" | "vesting" }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const pathname = usePathname();
  const [rows, setRows] = useState<PositionView[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  const reload = useCallback(() => {
    if (!address) return;
    setLoading(true);
    const qs = new URLSearchParams({ wallet: address });
    if (kind) qs.set("type", kind);
    fetch(`/api/positions?${qs}`)
      .then((r) => r.json())
      .then((data) => setRows(data.positions ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [address, kind]);

  useEffect(() => {
    reload();
  }, [reload]);

  const me = address?.toLowerCase();
  const visible = rows.filter((p) =>
    tab === "all" ? true : tab === "incoming" ? p.beneficiary === me : p.creator === me
  );
  const count = (t: Tab) => rows.filter((p) => (t === "all" ? true : t === "incoming" ? p.beneficiary === me : p.creator === me)).length;
  const noun = kind === "lock" ? "lock" : kind === "vesting" ? "vesting schedule" : "position";

  if (!isConnected) {
    return (
      <div className="card">
        <div className="empty-hero">
          <span className="ic">
            <svg className="icon-lg" aria-hidden="true"><use href="#i-wallet" /></svg>
          </span>
          <h2>No wallet connected</h2>
          <p>Connect a wallet to see the {noun}s you created or receive. Public proof pages never need one.</p>
          <button className="btn btn-primary" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
            {isPending ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="tab-row" role="tablist" aria-label="Filter by your role">
        {(["all", "incoming", "outgoing"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)} title={TAB_HINT[t] || undefined}>
            {TAB_LABEL[t]}
            <span>{count(t)}</span>
          </button>
        ))}
        {loading && <span className="live-tag" style={{ marginLeft: "auto" }}>Loading…</span>}
      </div>

      {!loading && visible.length === 0 ? (
        <div className="card">
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true"><use href={kind === "vesting" ? "#i-chart" : kind === "lock" ? "#i-lock" : "#i-layers"} /></svg>
            </span>
            <h2>Nothing here yet</h2>
            <p>
              {tab === "incoming"
                ? `No ${noun} names this wallet as the beneficiary.`
                : tab === "outgoing"
                  ? `This wallet hasn't created a ${noun} yet.`
                  : `Create a ${noun} and it shows up here once the indexer catches up.`}
            </p>
            {tab !== "incoming" && (
              <Link href={`${pathname}?create=${kind ?? "lock"}`} scroll={false} className="btn btn-primary">
                Create {kind === "vesting" ? "vesting" : "lock"}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ul className="pos-list">
          {visible.map((p) => (
            <PositionItem key={`${p.chainId}-${p.manager}-${p.positionId}`} position={p} me={me!} onChanged={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PositionItem({ position: p, me, onChanged }: { position: PositionView; me: string; onChanged: () => void }) {
  const flow = useTxFlow();
  const status = statusOf(p);
  const pct = Math.min(100, Math.max(0, progressOf(p)));
  const release = releaseAt(p);
  const claimable = claimableOf(p);
  const isBeneficiary = p.beneficiary === me;
  const isCreator = p.creator === me;
  const busy = !["idle", "included", "user_rejected", "reverted", "error", "cancelled"].includes(flow.status);

  useEffect(() => {
    if (flow.status === "included") onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.status]);

  async function act() {
    if (p.kind === "lock") {
      await flow.run({ address: p.manager as `0x${string}`, abi: lockManagerAbi, functionName: "withdraw", args: [BigInt(p.positionId)] });
    } else {
      await flow.run({ address: p.manager as `0x${string}`, abi: vestingManagerAbi, functionName: "claim", args: [BigInt(p.positionId)] });
    }
  }

  const title = p.label ?? `${tokenLabel(p)} ${p.kind === "lock" ? "lock" : "vesting"}`;
  const settled = status === "withdrawn" || status === "fully_claimed";

  return (
    <li className="pos-item">
      <div className="pos-main">
        <span className="token-tile">
          <svg className="icon" aria-hidden="true"><use href={p.kind === "lock" ? "#i-lock" : "#i-chart"} /></svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <b className="pos-title">{title}</b>
          <small className="mono">
            #{p.positionId} · {tokenLabel(p)} · {isBeneficiary && isCreator ? "yours" : isBeneficiary ? "incoming" : "outgoing"}
          </small>
        </div>
      </div>

      <div className="pos-amount">
        {formatAmount(p)} <small>{tokenLabel(p)}</small>
      </div>

      <div className="pos-progress">
        <span>
          <em>{p.kind === "lock" ? (status === "locked" ? "Unlocks" : "Unlocked") : "Vests until"}</em>
          <em>{release ? formatShort(release) : "—"}</em>
        </span>
        <i><b style={{ width: `${pct}%` }} /></i>
      </div>

      <span className={settled ? "badge badge-muted" : "badge"}>{STATUS_LABEL[status]}</span>

      <div className="pos-actions">
        {isBeneficiary && claimable > 0n && (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={act}>
            {busy ? txStatusLabel(flow.status) : p.kind === "lock" ? "Withdraw" : `Claim ${formatAmount(p, claimable, 2)}`}
          </button>
        )}
        <ShareButton position={p} />
        <Link href={proofPath(p)} className="btn btn-ghost btn-sm" aria-label={`Proof page for position ${p.positionId}`}>
          Proof
        </Link>
      </div>
      {flow.status === "error" && <p className="pos-error">{flow.errorMessage}</p>}
      {flow.status === "reverted" && <p className="pos-error">Reverted onchain — nothing moved.</p>}
    </li>
  );
}
