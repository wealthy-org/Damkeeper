import { db } from "@/db/client";
import { chainCheckpoints, deployments } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [checkpoints, deploys] = await Promise.all([
    db.select().from(chainCheckpoints),
    db.select().from(deployments),
  ]);

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          Status
        </div>
        <h1>Indexing status</h1>
        <p className="page-lede">
          Indexing progress per deployed manager. Data may lag the chain — check{" "}
          <code className="mono">asOfBlock</code> on any API response before treating a number as
          current.
        </p>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Deployed managers</h2>
        </div>
        {deploys.length === 0 ? (
          <div className="empty-state">
            <strong>Nothing to index yet</strong>
            <p>Populate the <code className="mono">deployments</code> table once a manager is deployed and verified.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Chain</th>
                <th>Manager</th>
                <th>Kind</th>
                <th>Last indexed block</th>
                <th>Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map((d) => {
                const cp = checkpoints.find(
                  (c) => c.chainId === d.chainId && c.managerAddress === d.managerAddress
                );
                return (
                  <tr key={`${d.chainId}-${d.managerAddress}`}>
                    <td>{d.chainId}</td>
                    <td className="mono">{d.managerAddress.slice(0, 6)}…{d.managerAddress.slice(-4)}</td>
                    <td style={{ textTransform: "capitalize" }}>{d.kind}</td>
                    <td className="mono">{cp ? cp.lastBlock.toString() : "not indexed yet"}</td>
                    <td>
                      {cp ? (
                        <span className="badge">{cp.confirmationTier}</span>
                      ) : (
                        <span style={{ color: "var(--faint)" }}>—</span>
                      )}
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
