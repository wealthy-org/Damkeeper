import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chainById } from "@/lib/chains";
import { formatLocal, formatUtc } from "@/lib/dates";
import { shortAddress } from "@/lib/position-view";
import { burnPct, burnSymbol, formatBurnAmount, listBurns, supplyBefore, type BurnView } from "@/lib/burns";
import { BurnShareButton } from "../../../share/share-button";

export const dynamic = "force-dynamic";

type Params = { chainId: string; txHash: string };
type Search = { log?: string };

async function loadBurn(params: Params, searchParams: Search): Promise<BurnView | null> {
  const chainId = Number(params.chainId);
  if (!chainId || !/^0x[0-9a-fA-F]{64}$/.test(params.txHash)) return null;
  const rows = await listBurns({ chainId, txHash: params.txHash, limit: 50 });
  if (rows.length === 0) return null;
  const log = Number(searchParams.log);
  return rows.find((b) => b.logIndex === log) ?? rows[rows.length - 1];
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const b = await loadBurn(params, searchParams);
  if (!b) return { title: "Burn Not Found", description: "This burn does not exist or has not been indexed yet." };
  const sym = burnSymbol(b);
  const title = `${formatBurnAmount(b)} ${sym} ${b.mode === "burn" ? "burned" : "sent to dead address"}`;
  const description =
    b.mode === "burn"
      ? `${formatBurnAmount(b)} ${sym} permanently burned on Robinhood Chain. Verify the transaction on Damkeeper.`
      : `${formatBurnAmount(b)} ${sym} sent to 0x…dEaD on Robinhood Chain, removed from circulation. Verify on Damkeeper.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary", title, description } };
}

export default async function BurnProofPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const b = await loadBurn(params, searchParams);
  if (!b) notFound();

  const explorer = chainById(b.chainId)?.blockExplorers.default.url ?? "https://robinhoodchain.blockscout.com";
  const txUrl = `${explorer}/tx/${b.txHash}`;
  const sym = burnSymbol(b);
  const native = b.mode === "burn";
  const pct = burnPct(b);
  const before = supplyBefore(b);
  const burnedAt = new Date(Number(b.timestamp) * 1000);

  return (
    <main className="wrap">
      <div className="page-head">
        <Link href="/positions?type=burn" className="back-link">
          <svg className="icon" aria-hidden="true"><use href="#i-arrow" /></svg>
          Burns
        </Link>
        <div className="page-title-row">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="page-eyebrow">
              <span className="dot" />
              Public proof · {native ? "Burn" : "Dead-address transfer"}
            </div>
            <h1>{formatBurnAmount(b)} {sym} {native ? "burned" : "sent to 0x…dEaD"}</h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge">{native ? "burn()" : "Dead sink"}</span>
            <BurnShareButton
              burn={{
                txHash: b.txHash,
                amount: formatBurnAmount(b),
                symbol: sym,
                tokenAddress: b.token,
                burnMode: b.mode,
                newSupply: b.totalSupplyAfter ? formatBurnAmount(b, b.totalSupplyAfter) : "—",
                pctReduction: pct,
                chainId: b.chainId,
              }}
              txUrl={txUrl}
              className="btn btn-primary btn-sm"
            />
          </div>
        </div>
      </div>

      <section className="card">
        <div className="metric-grid" style={{ marginBottom: 18 }}>
          <div className="metric">
            <span>{native ? "Burned" : "Sent to dead address"}</span>
            <strong>{formatBurnAmount(b)}</strong>
            <small>{sym}</small>
          </div>
          <div className="metric">
            <span>{native ? "Supply before" : "Total supply"}</span>
            <strong>{before === null ? "—" : formatBurnAmount(b, before)}</strong>
            <small>{sym}</small>
          </div>
          <div className="metric accent">
            <span>{native ? "Supply cut" : "Circulating cut"}</span>
            <strong>{pct === "—" ? "—" : `-${pct}%`}</strong>
            <small>{native ? `New supply ${b.totalSupplyAfter ? formatBurnAmount(b, b.totalSupplyAfter) : "—"}` : "totalSupply unchanged"}</small>
          </div>
        </div>

        <dl className="kv">
          <Row label="Token" value={<Addr a={b.token} explorer={explorer} extra={b.tokenName ? `${sym} · ${b.tokenName}` : sym} />} />
          <Row label="Burned by" value={<Addr a={b.burner} explorer={explorer} />} />
          <Row label="Sent to" value={<Addr a={native ? "0x0000000000000000000000000000000000000000" : "0x000000000000000000000000000000000000dEaD"} explorer={explorer} />} />
          <Row
            label="Mechanism"
            value={native ? "burn() — tokens destroyed, totalSupply reduced" : "transfer to 0x…dEaD — no known key, totalSupply unchanged"}
          />
          <Row
            label="Time"
            value={
              <>
                {formatLocal(burnedAt)}
                <br />
                <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{formatUtc(burnedAt)}</span>
              </>
            }
          />
          <Row label="Block" value={<span className="mono">{b.blockNumber}</span>} />
          <Row
            label="Transaction"
            value={
              <a className="mono" href={txUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                {shortAddress(b.txHash)} ↗
              </a>
            }
          />
        </dl>
      </section>

      <p style={{ marginTop: 20, fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)", lineHeight: 1.8 }}>
        Read from the indexed Transfer event. Supply figures are the token&apos;s totalSupply at the burn&apos;s block. Not financial advice.
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

function Addr({ a, explorer, extra }: { a: string; explorer: string; extra?: string }) {
  return (
    <>
      {extra && <span style={{ marginRight: 8 }}>{extra}</span>}
      <a className="mono" href={`${explorer}/address/${a}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
        {shortAddress(a)} ↗
      </a>
    </>
  );
}
