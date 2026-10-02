import Link from "next/link";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { positions, tokens } from "@/db/schema";
import { formatTokenAmount } from "@/lib/amounts";
import { shortAddress } from "@/lib/position-view";
import { getPlatformStats } from "@/lib/platform-stats";

export const dynamic = "force-dynamic";

const SORTS = {
  newest: "Newest positions",
  positions: "Most positions",
  name: "Name A–Z",
} as const;
type Sort = keyof typeof SORTS;

export default async function TokensPage({ searchParams }: { searchParams: { q?: string; sort?: string; view?: string } }) {
  const q = searchParams.q?.trim().slice(0, 66) ?? "";
  const sort: Sort = searchParams.sort && searchParams.sort in SORTS ? (searchParams.sort as Sort) : "newest";
  const view = searchParams.view === "list" ? "list" : "grid";

  const count = sql<number>`count(*)::int`;
  const latest = sql<string>`max(${positions.createdAt})`;
  const rows = await db
    .select({
      chainId: positions.chainId,
      token: positions.token,
      symbol: tokens.symbol,
      name: tokens.name,
      decimals: tokens.decimals,
      total: count,
      active: sql<number>`(count(*) filter (where not ${positions.withdrawn} and ${positions.claimedAmount} < ${positions.amount}))::int`,
      locked: sql<string>`coalesce(sum(case when ${positions.withdrawn} then 0 else ${positions.amount} - ${positions.claimedAmount} end), 0)::text`,
      latest,
    })
    .from(positions)
    .leftJoin(tokens, and(eq(tokens.chainId, positions.chainId), eq(tokens.address, positions.token)))
    .where(
      q
        ? or(ilike(positions.token, `%${q.toLowerCase()}%`), ilike(tokens.symbol, `%${q}%`), ilike(tokens.name, `%${q}%`))
        : undefined
    )
    .groupBy(positions.chainId, positions.token, tokens.symbol, tokens.name, tokens.decimals)
    .orderBy(sort === "positions" ? desc(count) : sort === "name" ? asc(tokens.symbol) : desc(latest))
    .limit(120);

  const stats = await getPlatformStats();

  const href = (next: Partial<{ q: string; sort: Sort; view: string }>) => {
    const params = new URLSearchParams();
    const merged = { q, sort, view, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.sort !== "newest") params.set("sort", merged.sort);
    if (merged.view !== "grid") params.set("view", merged.view);
    const s = params.toString();
    return s ? `/tokens?${s}` : "/tokens";
  };

  return (
    <main className="wrap">
      <div className="page-title-row" style={{ marginBottom: 24 }}>
        <div className="page-head" style={{ marginBottom: 0 }}>
          <h1>Tokens</h1>
          <p className="page-lede">Every token with a lock or vesting schedule on Damkeeper. Open one to see all its positions.</p>
        </div>
        <form className="search inline-search" action="/tokens" role="search">
          <svg className="icon" aria-hidden="true"><use href="#i-search" /></svg>
          <label htmlFor="token-search" className="sr-only">Search tokens</label>
          <input id="token-search" name="q" defaultValue={q} placeholder="Symbol, name or address" autoComplete="off" />
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          {view !== "grid" && <input type="hidden" name="view" value={view} />}
        </form>
      </div>

      <div className="metric-grid" style={{ marginBottom: 24 }}>
        <div className="metric accent"><span><span className="status-dot live" />Tokens</span><strong>{stats.tokens}</strong><small>with positions</small></div>
        <div className="metric accent"><span><span className="status-dot live" />Active</span><strong>{stats.activeLocks + stats.activeVesting}</strong><small>locks and vesting</small></div>
        <div className="metric"><span>Settled</span><strong>{stats.settled}</strong><small>withdrawn or fully claimed</small></div>
        <div className="metric"><span>Enabled</span><strong>{stats.enabledTokens}</strong><small>open for new deposits</small></div>
      </div>

      <div className="toolbar">
        <nav className="filter-tabs" aria-label="Sort tokens">
          {(Object.keys(SORTS) as Sort[]).map((s) => (
            <Link key={s} href={href({ sort: s })} aria-current={sort === s ? "page" : undefined}>{SORTS[s]}</Link>
          ))}
        </nav>
        <nav className="filter-tabs" aria-label="Layout">
          <Link href={href({ view: "grid" })} aria-current={view === "grid" ? "page" : undefined}>Grid</Link>
          <Link href={href({ view: "list" })} aria-current={view === "list" ? "page" : undefined}>List</Link>
        </nav>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty-hero">
            <span className="ic"><svg className="icon-lg" aria-hidden="true"><use href="#i-coins" /></svg></span>
            <h2>{q ? "No tokens match" : "No tokens yet"}</h2>
            <p>{q ? "Try a symbol like DAM or a full token address." : "Tokens appear here after their first lock or vesting schedule is indexed."}</p>
          </div>
        </div>
      ) : (
        <ul className={view === "list" ? "token-list" : "token-grid"}>
          {rows.map((t) => {
            const symbol = t.symbol ?? shortAddress(t.token);
            return (
              <li key={`${t.chainId}-${t.token}`}>
                <Link href={`/positions?q=${t.token}`} className="token-card">
                  <div className="token-card-head">
                    <span className="token-avatar">{symbol.replace(/^\$/, "").slice(0, 1).toUpperCase()}</span>
                    <span style={{ minWidth: 0 }}>
                      <b>{symbol}</b>
                      <small>{t.name ?? "Unknown name"}</small>
                    </span>
                    <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
                  </div>
                  <dl className="token-card-stats">
                    <div><dt>Still held</dt><dd className="accent">{formatTokenAmount(BigInt(t.locked), t.decimals ?? 18, 2)}</dd></div>
                    <div><dt>Active</dt><dd>{t.active}</dd></div>
                    <div><dt>Positions</dt><dd>{t.total}</dd></div>
                  </dl>
                  <span className="token-card-addr mono">{shortAddress(t.token)}{t.decimals === null && " · metadata unreadable"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="field-note" style={{ marginTop: 16 }}>
        Amounts are in each token&apos;s own units. There&apos;s no price feed, so no dollar values are shown.
      </p>
    </main>
  );
}
