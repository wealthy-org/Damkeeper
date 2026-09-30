"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { robinhoodTestnet } from "@/lib/chains";
import { WrongNetworkBanner } from "./wrong-network-banner";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  match: (pathname: string, type: string | null) => boolean;
}

const productNav: NavItem[] = [
  { href: "/app", label: "Home", icon: "i-home", match: (p) => p === "/app" },
  {
    href: "/positions?type=lock",
    label: "Locks",
    icon: "i-lock",
    match: (p, t) => (p === "/positions" && t === "lock") || p.startsWith("/lock/"),
  },
  {
    href: "/positions?type=vesting",
    label: "Vesting",
    icon: "i-chart",
    match: (p, t) => (p === "/positions" && t === "vesting") || p.startsWith("/vesting/"),
  },
  { href: "/positions", label: "Explore", icon: "i-layers", match: (p, t) => p.startsWith("/positions") && !t },
];

const recordsNav: NavItem[] = [
  { href: "/transparency", label: "Transparency", icon: "i-shield", match: (p) => p === "/transparency" },
  { href: "/status", label: "Status", icon: "i-clock", match: (p) => p === "/status" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="shell" data-open={open}>
      <aside className="sidebar" aria-label="App navigation">
        <Link href="/" className="sb-brand" aria-label="Damkeeper home">
          <img src="/logo-wordmark.png" alt="Damkeeper" style={{ height: 24, width: "auto" }} />
        </Link>

        <div className="sb-ctas">
          <Link href="/lock/new" className="btn btn-primary">
            <svg className="icon" aria-hidden="true"><use href="#i-lock" /></svg>
            Create lock
          </Link>
          <Link href="/vesting/new" className="btn btn-ghost">
            <svg className="icon" aria-hidden="true"><use href="#i-chart" /></svg>
            Create vesting
          </Link>
        </div>

        <Suspense fallback={<NavLists pathname={pathname} type={null} />}>
          <NavListsWithParams pathname={pathname} />
        </Suspense>

        <div className="sb-network">
          <span className="sb-label">Network</span>
          <div className="sb-network-card">
            <span className="sb-chain">
              <svg className="icon" aria-hidden="true"><use href="#i-layers" /></svg>
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.35 }}>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>Robinhood Chain</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>
                Testnet · {robinhoodTestnet.id}
              </span>
            </span>
          </div>
        </div>
      </aside>

      <button className="sb-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />

      <div className="shell-main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" aria-label="Open menu" onClick={() => setOpen(true)}>
            <svg className="icon" aria-hidden="true"><use href="#i-menu" /></svg>
          </button>
          <SearchBox />
          <div className="topbar-end">
            <WalletControl />
          </div>
        </header>
        <WrongNetworkBanner />
        {children}
      </div>
    </div>
  );
}

function NavListsWithParams({ pathname }: { pathname: string }) {
  const params = useSearchParams();
  return <NavLists pathname={pathname} type={params.get("type")} />;
}

function NavLists({ pathname, type }: { pathname: string; type: string | null }) {
  return (
    <>
      <nav className="sb-nav" aria-label="Product">
        {productNav.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(pathname, type)} />
        ))}
      </nav>
      <div>
        <span className="sb-label">Public records</span>
        <nav className="sb-nav" aria-label="Public records">
          {recordsNav.map((item) => (
            <NavLink key={item.href} item={item} active={item.match(pathname, type)} />
          ))}
        </nav>
      </div>
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} data-active={active} aria-current={active ? "page" : undefined}>
      <svg className="icon" aria-hidden="true"><use href={`#${item.icon}`} /></svg>
      {item.label}
    </Link>
  );
}

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/positions?q=${encodeURIComponent(query)}` : "/positions");
  }

  return (
    <form className="search" role="search" onSubmit={submit}>
      <svg className="icon" aria-hidden="true"><use href="#i-search" /></svg>
      <label htmlFor="global-search" className="sr-only">Search positions</label>
      <input
        id="global-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by address or position ID"
        autoComplete="off"
      />
    </form>
  );
}

function WalletControl() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="wallet-chip">
        <span className="status-dot live" />
        <span className="mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
        <button className="wallet-x" aria-label="Disconnect wallet" title="Disconnect" onClick={() => disconnect()}>
          <svg className="icon" aria-hidden="true"><use href="#i-close" /></svg>
        </button>
      </div>
    );
  }

  return (
    <button className="btn btn-primary btn-sm" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
