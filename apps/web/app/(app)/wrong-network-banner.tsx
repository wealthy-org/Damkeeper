"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { robinhoodMainnet, robinhoodTestnet } from "@/lib/chains";

// brief.md section 10: "Network label selalu terlihat; tombol submit diblokir pada
// network yang salah." Shared by the nav (always-visible banner) and the create-flow
// pages (which also read `wrongNetwork` to disable their submit buttons).
export function useWrongNetwork() {
  const { chainId, isConnected } = useAccount();
  return isConnected && chainId !== undefined && chainId !== robinhoodMainnet.id && chainId !== robinhoodTestnet.id;
}

export function WrongNetworkBanner() {
  const wrongNetwork = useWrongNetwork();
  const { switchChain, isPending } = useSwitchChain();

  if (!wrongNetwork) return null;

  return (
    <div
      style={{
        background: "#f3866b12",
        borderBottom: "1px solid #f3866b33",
        padding: "10px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontSize: 12,
        color: "#f3866b",
      }}
    >
      <svg className="icon" aria-hidden="true"><use href="#i-shield" /></svg>
      Your wallet is on the wrong network. Damkeeper works on Robinhood Chain.
      <button
        className="btn btn-ghost"
        style={{ minHeight: 30, fontSize: 11, borderColor: "#f3866b55", color: "#f3866b" }}
        disabled={isPending}
        onClick={() => switchChain({ chainId: robinhoodMainnet.id })}
      >
        {isPending ? "Switching…" : "Switch to Robinhood Chain"}
      </button>
    </div>
  );
}
