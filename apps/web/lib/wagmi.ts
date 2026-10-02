"use client";

import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodTestnet, robinhoodMainnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [robinhoodMainnet, robinhoodTestnet],
  connectors: [injected()],
  transports: {
    [robinhoodMainnet.id]: http(),
    [robinhoodTestnet.id]: http(),
  },
  // The client auto-reconnects a previously-connected wallet (Phantom, MetaMask, …)
  // from storage before React finishes hydrating, so useAccount() briefly disagrees
  // with the server's always-disconnected render. `ssr: true` makes wagmi hold the
  // client at the server's "disconnected" snapshot until hydration completes, then
  // reconciles — see https://wagmi.sh/react/guides/ssr
  ssr: true,
});
