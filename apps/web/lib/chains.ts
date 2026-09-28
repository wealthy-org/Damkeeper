// Robinhood Chain network config.
// Verified against docs.robinhood.com/chain/connecting on 2026-09-28 — re-check before every deployment.
export const robinhoodTestnet = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    // No hardcoded RPC shipped: paid provider keys (Alchemy free tier, etc.) go in
    // NEXT_PUBLIC_TESTNET_RPC_URL. Falls back to Blockscout's public JSON-RPC passthrough,
    // which is free but rate-limited — fine for local dev, not for production traffic.
    // Confirm current endpoints at docs.robinhood.com/chain/connecting before relying on this.
    default: {
      http: [
        process.env.NEXT_PUBLIC_TESTNET_RPC_URL ??
          "https://explorer.testnet.chain.robinhood.com/api/eth-rpc",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  testnet: true,
} as const;

export const robinhoodMainnet = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MAINNET_RPC_URL ??
          "https://robinhoodchain.blockscout.com/api/eth-rpc",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
  testnet: false,
} as const;

export const chains = [robinhoodTestnet, robinhoodMainnet] as const;

export function chainById(chainId: number) {
  return chains.find((c) => c.id === chainId);
}
