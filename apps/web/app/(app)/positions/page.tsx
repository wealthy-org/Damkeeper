import { db } from "@/db/client";
import { positions } from "@/db/schema";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const rows = await db.select().from(positions).limit(50);

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          Explore
        </div>
        <h1>Every position, in clear view</h1>
        <p className="page-lede">
          Locks and vesting schedules read directly from indexed contract state. No wallet
          required to look.
        </p>
      </div>

      <section className="card">
        {rows.length === 0 ? (
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true"><use href="#i-layers" /></svg>
            </span>
            <h2>No positions indexed yet</h2>
            <p>
              Once a manager is deployed and the cron indexer runs (<code className="mono">/api/cron/index</code>),
              created locks and vesting schedules will appear here automatically.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kind</th>
                <th>Token</th>
                <th>Amount</th>
                <th>Beneficiary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={`${p.chainId}-${p.managerAddress}-${p.positionId}`}>
                  <td>
                    <span className="badge">
                      <svg className="icon" style={{ width: 11, height: 11 }} aria-hidden="true">
                        <use href={p.kind === "lock" ? "#i-lock" : "#i-chart"} />
                      </svg>
                      {p.kind}
                    </span>
                  </td>
                  <td className="mono">{p.token.slice(0, 6)}…{p.token.slice(-4)}</td>
                  <td className="mono">{p.amount}</td>
                  <td className="mono">{p.beneficiary.slice(0, 6)}…{p.beneficiary.slice(-4)}</td>
                  <td>
                    <Link href={`/positions/${p.chainId}/${p.managerAddress}/${p.positionId}`} className="btn btn-ghost" style={{ minHeight: 32, fontSize: 12 }}>
                      View proof
                      <svg className="icon" style={{ width: 12, height: 12 }} aria-hidden="true"><use href="#i-up" /></svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
