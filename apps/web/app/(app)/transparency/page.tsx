import { db } from "@/db/client";
import { deployments, tokenPolicies } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function TransparencyPage() {
  const [deploys, policies] = await Promise.all([
    db.select().from(deployments),
    db.select().from(tokenPolicies),
  ]);

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          Transparency
        </div>
        <h1>Clear rules. Public records.</h1>
        <p className="page-lede">
          Deployment records, token policy and review status. Nothing here is a claim of an
          audit unless a report is linked.
        </p>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            <svg className="icon" style={{ marginRight: 8, color: "var(--accent)" }} aria-hidden="true"><use href="#i-code" /></svg>
            Deployments
          </h2>
        </div>
        {deploys.length === 0 ? (
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true"><use href="#i-code" /></svg>
            </span>
            <h2>No manager deployed yet</h2>
            <p>
              This will list chain, address, version, verified source and admin once a deployment
              manifest exists (brief.md section 12).
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Chain</th>
                <th>Kind</th>
                <th>Manager</th>
                <th>Version</th>
                <th>Source</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map((d) => (
                <tr key={`${d.chainId}-${d.managerAddress}`}>
                  <td>{d.chainId}</td>
                  <td style={{ textTransform: "capitalize" }}>{d.kind}</td>
                  <td className="mono">{d.managerAddress.slice(0, 6)}…{d.managerAddress.slice(-4)}</td>
                  <td>{d.version}</td>
                  <td>
                    {d.verifiedSourceUrl ? (
                      <a href={d.verifiedSourceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                        Verified source
                      </a>
                    ) : (
                      <span style={{ color: "var(--faint)" }}>Pending</span>
                    )}
                  </td>
                  <td className="mono">{d.admin.slice(0, 6)}…{d.admin.slice(-4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <svg className="icon" style={{ marginRight: 8, color: "var(--accent)" }} aria-hidden="true"><use href="#i-shield" /></svg>
            Token policy
          </h2>
        </div>
        {policies.length === 0 ? (
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true"><use href="#i-shield" /></svg>
            </span>
            <h2>No token admitted yet</h2>
            <p>A token needs to be reviewed and enabled onchain before it can be used to create a position.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Manager</th>
                <th>Enabled</th>
                <th>Cap (raw units)</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={`${p.chainId}-${p.managerAddress}-${p.token}`}>
                  <td className="mono">{p.token.slice(0, 6)}…{p.token.slice(-4)}</td>
                  <td className="mono">{p.managerAddress.slice(0, 6)}…{p.managerAddress.slice(-4)}</td>
                  <td>
                    <span className="badge">{p.enabled ? "Enabled" : "Disabled"}</span>
                  </td>
                  <td className="mono">{p.liabilityCap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
