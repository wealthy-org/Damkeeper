"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";

const links = [
  { href: "/app", label: "Dashboard" },
  { href: "/positions", label: "Explore" },
  { href: "/transparency", label: "Transparency" },
  { href: "/status", label: "Status" },
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
            <Link key={link.href} href={link.href} data-active={pathname === link.href}>
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
