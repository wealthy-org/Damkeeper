import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { positionEvents } from "@/db/schema";
import { chainById } from "@/lib/chains";
import { getPosition } from "@/lib/positions-query";
import { formatLocal, formatUtc } from "@/lib/dates";
import {
  claimableOf,
  formatAmount,
  progressOf,
  releaseAt,
  shortAddress,
  statusOf,
  STATUS_LABEL,
  tokenLabel,
} from "@/lib/position-view";
import { ShareButton } from "../../../../share/share-button";
import { ProofAction } from "./proof-action";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  LockCreated: "Lock created",
  LockWithdrawn: "Withdrawn",
  VestingCreated: "Schedule created",
  VestingClaimed: "Claimed",
};

export default async function ProofPage({ params }: { params: { chainId: string; manager: string; id: string } }) {
  const chainId = Number(params.chainId);
  if (!chainId || !/^\d{1,18}$/.test(params.id)) notFound();
  const manager = params.manager.toLowerCase();
  const positionId = BigInt(params.id);

  const p = await getPosition(chainId, manager, positionId);
  if (!p) notFound();

  const events = await db
    .select()
    .from(positionEvents)
    .where(
      and(
        eq(positionEvents.chainId, chainId),
        eq(positionEvents.managerAddress, manager),
        eq(positionEvents.positionId, positionId),
        eq(positionEvents.canonical, true)
      )
    )
    .orderBy(asc(positionEvents.blockNumber), asc(positionEvents.logIndex));

  const explorer = chainById(chainId)?.blockExplorers.default.url;
  const isVesting = p.kind === "vesting";
  const status = statusOf(p);
  const pct = Math.min(100, Math.max(0, progressOf(p)));
  const sym = tokenLabel(p);
  const at = (s: string | null) => (s && s !== "0" ? new Date(Number(s) * 1000) : null);
  const release = releaseAt(p);
  const settled = status === "withdrawn" || status === "fully_claimed";

  return (
    <main className="wrap">
      <div className="page-head">
        <Link href="/positions" className="back-link">
          <svg className="icon" aria-hidden="true"><use href="#i-arrow" /></svg>
          Explore
        </Link>
        <div className="page-title-row">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="page-eyebrow">
              <span className="dot" />
              Public proof · {isVesting ? "Vesting" : "Lock"} #{p.positionId}
            </div>
            <h1>{p.label ?? `${sym} ${isVesting ? "vesting" : "lock"}`}</h1>
            {p.label && <p className="field-note">Label set by the creator and stored offchain. It isn&apos;t part of the onchain terms.</p>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={settled ? "badge badge-muted" : "badge"}>{STATUS_LABEL[status]}</span>
            <ShareButton position={p} className="btn btn-primary btn-sm" />
          </div>
        </div>
        {p.source === "chain" && (
          <p className="field-note" style={{ color: "var(--accent)" }}>
            Read straight from the contract — the indexer hasn&apos;t picked this position up yet, so history below may be empty for a few minutes.
          </p>
        )}
      </div>

      <section className="card">
        <div className="metric-grid" style={{ marginBottom: 18 }}>
          <div className="metric">
            <span>Deposited</span>
            <strong>{formatAmount(p)}</strong>
            <small>{sym}</small>
          </div>
          <div className="metric">
            <span>{isVesting ? "Claimed" : "Withdrawn"}</span>
            <strong>{isVesting ? formatAmount(p, p.claimedAmount) : p.withdrawn ? formatAmount(p) : "0"}</strong>
            <small>{sym}</small>
          </div>
          <div className="metric accent">
            <span>{isVesting ? "Claimable now" : "Withdrawable now"}</span>
            <strong>{formatAmount(p, claimableOf(p))}</strong>
            <small>{release ? `${isVesting ? "Fully vested" : "Unlocks"} ${formatLocal(release)}` : sym}</small>
          </div>
        </div>
        <div className="pos-progress" style={{ marginBottom: 18 }}>
          <span>
            <em>{isVesting ? "Vested" : "Time to unlock"}</em>
            <em>{pct}%</em>
          </span>
          <i><b style={{ width: `${pct}%` }} /></i>
        </div>

        <dl className="kv">
          <Row label="Token" value={<Addr a={p.token} explorer={explorer} extra={p.tokenName ? `${sym} · ${p.tokenName}` : sym} />} />
          <Row label="Creator" value={<Addr a={p.creator} explorer={explorer} />} />
          <Row label="Beneficiary" value={<Addr a={p.beneficiary} explorer={explorer} />} />
          {isVesting ? (
            <>
              <Row label="Start" value={<When d={at(p.startTime)} />} />
              <Row label="Cliff" value={at(p.cliffTime) ? <When d={at(p.cliffTime)} /> : "None"} />
              <Row label="End" value={<When d={at(p.endTime)} />} />
              <Row label="Schedule" value="Linear, released every second" />
            </>
          ) : (
            <Row label="Unlocks" value={<When d={at(p.unlockTime)} />} />
          )}
          <Row label="Created" value={<When d={at(p.createdAt)} />} />
          <Row label="Contract" value={<Addr a={p.manager} explorer={explorer} />} />
        </dl>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <svg className="icon" style={{ marginRight: 8, color: "var(--accent)" }} aria-hidden="true">
              <use href={isVesting ? "#i-up" : "#i-lock"} />
            </svg>
            {isVesting ? "Claim" : "Withdraw"}
          </h2>
        </div>
        <ProofAction
          kind={p.kind}
          manager={p.manager}
          positionId={p.positionId}
          beneficiary={p.beneficiary}
          amount={p.amount}
          claimedAmount={p.claimedAmount}
          unlockTime={p.unlockTime}
          startTime={p.startTime}
          cliffTime={p.cliffTime}
          endTime={p.endTime}
          withdrawn={p.withdrawn}
        />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>History</h2>
        </div>
        {events.length === 0 ? (
          <p className="field-note">No indexed events yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Block</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={`${e.txHash}-${e.logIndex}`}>
                  <td>{EVENT_LABEL[e.eventName] ?? e.eventName}</td>
                  <td className="mono">{e.blockNumber.toString()}</td>
                  <td className="mono">
                    {explorer ? (
                      <a href={`${explorer}/tx/${e.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                        {shortAddress(e.txHash)} ↗
                      </a>
                    ) : (
                      shortAddress(e.txHash)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ marginTop: 20, fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)", lineHeight: 1.8 }}>
        Not financial advice. A lock proves only that this specific allocation sits in the contract under these terms.
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="kv-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function When({ d }: { d: Date | null }) {
  if (!d) return <>—</>;
  return (
    <>
      {formatLocal(d)}
      <br />
      <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{formatUtc(d)}</span>
    </>
  );
}

function Addr({ a, explorer, extra }: { a: string; explorer?: string; extra?: string }) {
  return (
    <>
      {extra && <span style={{ marginRight: 8 }}>{extra}</span>}
      {explorer ? (
        <a className="mono" href={`${explorer}/address/${a}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
          {shortAddress(a)} ↗
        </a>
      ) : (
        <span className="mono">{shortAddress(a)}</span>
      )}
    </>
  );
}
