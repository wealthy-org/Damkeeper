import Link from "next/link";
import { listPositions } from "@/lib/positions-query";
import { formatShort } from "@/lib/dates";
import { formatAmount, proofPath, releaseAt, shortAddress, statusOf, STATUS_LABEL, tokenLabel } from "@/lib/position-view";
import { ShareButton } from "../share/share-button";

export const dynamic = "force-dynamic";

const COPY = {
  all: { eyebrow: "Explore", title: "Every position, in clear view" },
  lock: { eyebrow: "Locks", title: "Token locks" },
  vesting: { eyebrow: "Vesting", title: "Vesting schedules" },
} as const;

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: { type?: string; q?: string };
}) {
  const type = searchParams.type === "lock" || searchParams.type === "vesting" ? searchParams.type : "all";
  const q = searchParams.q?.trim().slice(0, 66) ?? "";

  const rows = await listPositions({ kind: type === "all" ? undefined : type, q: q || undefined, limit: 100 });

  const tabHref = (t: "all" | "lock" | "vesting") => {
    const params = new URLSearchParams();
    if (t !== "all") params.set("type", t);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/positions?${s}` : "/positions";
  };

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          {COPY[type].eyebrow}
        </div>
        <h1>{COPY[type].title}</h1>
        <p className="page-lede">
          Read directly from indexed contract state. No wallet required to look.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <nav className="filter-tabs" aria-label="Filter by type">
          {(["all", "lock", "vesting"] as const).map((t) => (
            <Link key={t} href={tabHref(t)} aria-current={type === t ? "page" : undefined}>
              {t === "all" ? "All" : t === "lock" ? "Locks" : "Vesting"}
            </Link>
          ))}
        </nav>
        {q && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Results for <span className="mono" style={{ color: "var(--text-2)" }}>{q}</span> ·{" "}
            <Link href={type === "all" ? "/positions" : `/positions?type=${type}`} style={{ color: "var(--accent)" }}>
              Clear
            </Link>
          </span>
        )}
      </div>

      <section className="card">
        {rows.length === 0 ? (
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true"><use href="#i-layers" /></svg>
            </span>
            <h2>{q ? "No positions match" : "No positions indexed yet"}</h2>
            <p>
              {q
                ? "Try a full wallet or token address, or a position number."
                : "Created locks and vesting schedules appear here once the indexer picks them up."}
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kind</th>
                <th>Position</th>
                <th>Amount</th>
                <th>Releases</th>
                <th>Beneficiary</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const status = statusOf(p);
                const release = releaseAt(p);
                return (
                  <tr key={`${p.chainId}-${p.manager}-${p.positionId}`}>
                    <td>
                      <span className="badge">
                        <svg className="icon" style={{ width: 11, height: 11 }} aria-hidden="true">
                          <use href={p.kind === "lock" ? "#i-lock" : "#i-chart"} />
                        </svg>
                        {p.kind}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: "block" }}>{p.label ?? tokenLabel(p)}</span>
                      <span className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>#{p.positionId} · {shortAddress(p.token)}</span>
                    </td>
                    <td className="mono">{formatAmount(p)} {tokenLabel(p)}</td>
                    <td className="mono">{release ? formatShort(release) : "—"}</td>
                    <td className="mono">{shortAddress(p.beneficiary)}</td>
                    <td><span className={status === "withdrawn" || status === "fully_claimed" ? "badge badge-muted" : "badge"}>{STATUS_LABEL[status]}</span></td>
                    <td>
                      <div className="pos-actions">
                        <ShareButton position={p} />
                        <Link href={proofPath(p)} className="btn btn-ghost btn-sm">Proof</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
