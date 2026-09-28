"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";

const links = [
  { href: "/app", label: "Dashboard", match: (p: string) => p === "/app" || p.startsWith("/lock/") || p.startsWith("/vesting/") },
  { href: "/positions", label: "Explore", match: (p: string) => p.startsWith("/positions") },
  { href: "/transparency", label: "Transparency", match: (p: string) => p === "/transparency" },
  { href: "/status", label: "Status", match: (p: string) => p === "/status" },
];

export function AppNav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link href="/" className="app-nav-brand" aria-label="Damkeeper home">
          <img src="/logo-wordmark.png" alt="Damkeeper" height={24} style={{ height: 24, width: "auto" }} />
        </Link>
        <nav className="app-nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} data-active={link.match(pathname)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="app-nav-end">
          <span className="app-nav-network">ROBINHOOD CHAIN</span>
          {isConnected && address ? (
            <span className="pill mono">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          ) : (
            <Link href="/app" className="btn btn-primary">
              Connect wallet
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
