import Link from "next/link";
import { getPlatformStats } from "@/lib/platform-stats";
import { FaucetCard } from "./faucet-button";
import { MyPositions } from "../my-positions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getPlatformStats();

  return (
    <main className="wrap">
      <section className="hero-banner">
        <span className="pill">
          <span className="status-dot live" />
          Testnet · Robinhood Chain
        </span>
        <h1>Token locks and vesting on Robinhood Chain</h1>
        <p>
          Hold an allocation in a contract with terms fixed before you sign, then share a proof
          page anyone can check. You need the ERC-20 you want to lock and a little testnet ETH for
          gas. There is no platform fee.
        </p>
      </section>

      <div className="section-title">
        <h2>Platform activity</h2>
        <span className="live-tag">
          <span className="status-dot live" />
          {stats.lastBlock ? `Indexed to block ${Number(stats.lastBlock).toLocaleString("en-US")}` : "Not indexed yet"}
        </span>
      </div>

      <div className="metric-grid">
        <Metric label="Active locks" value={stats.activeLocks} sub="waiting for unlock" accent />
        <Metric label="Active vesting" value={stats.activeVesting} sub="still releasing" accent />
        <Metric label="Settled" value={stats.settled} sub="withdrawn or fully claimed" />
        <Metric label="Total positions" value={stats.total} sub="locks and vesting" />
        <Metric label="Tokens" value={stats.tokens} sub="with positions" />
        <Metric label="Enabled tokens" value={stats.enabledTokens} sub="open for new deposits" />
      </div>

      <div className="section-title">
        <h2>Get started</h2>
      </div>

      <div className="start-grid">
        <article className="start-card">
          <span className="tile">
            <svg className="icon" aria-hidden="true"><use href="#i-lock" /></svg>
          </span>
          <h3>Token lock</h3>
          <p>
            Hold tokens until one fixed unlock date. Only the withdrawal wallet you name can take
            them out, and only after that date.
          </p>
          <Link href="/app?create=lock" scroll={false} className="btn btn-primary">Create lock</Link>
        </article>
        <article className="start-card">
          <span className="tile">
            <svg className="icon" aria-hidden="true"><use href="#i-chart" /></svg>
          </span>
          <h3>Linear vesting</h3>
          <p>
            Release tokens second by second from a start date to an end date, with an optional
            cliff. The beneficiary claims what has vested.
          </p>
          <Link href="/app?create=vesting" scroll={false} className="btn btn-primary">Create vesting</Link>
        </article>
      </div>

      <div className="section-title">
        <h2>You can also</h2>
      </div>

      <div className="try-grid">
        <FaucetCard />
        <Link href="/positions" className="try-card">
          <svg className="icon" aria-hidden="true"><use href="#i-layers" /></svg>
          <span>
            Explore positions
            <small>Every lock and schedule, no wallet needed</small>
          </span>
        </Link>
        <Link href="/transparency" className="try-card">
          <svg className="icon" aria-hidden="true"><use href="#i-shield" /></svg>
          <span>
            Check the contracts
            <small>Addresses, verified source, token policy</small>
          </span>
        </Link>
      </div>

      <div className="section-title">
        <h2>Your positions</h2>
        <Link href="/locks" className="live-tag">All locks and vesting →</Link>
      </div>
      <MyPositions />
    </main>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: number; sub: string; accent?: boolean }) {
  return (
    <div className={accent ? "metric accent" : "metric"}>
      <span>
        {accent && <span className="status-dot live" />}
        {label}
      </span>
      <strong>{value.toLocaleString("en-US")}</strong>
      <small>{sub}</small>
    </div>
  );
}
