import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CliError } from "./ui";

export const TESTNET: Chain = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [] } },
  blockExplorers: { default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" } },
  testnet: true,
};

// When run from a checkout, borrow the web app's .env so a developer needs no extra setup.
// Real environment variables always win.
function repoEnv(): Record<string, string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const file = join(here, "..", "..", "..", "apps", "web", ".env");
  if (!existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const fileEnv = repoEnv();
const get = (k: string, ...fallbacks: string[]) => process.env[k] || fallbacks.map((f) => process.env[f] || fileEnv[f]).find(Boolean) || fileEnv[k];

export const cfg = {
  api: (get("DAMKEEPER_API") ?? "http://localhost:3000").replace(/\/$/, ""),
  web: (get("DAMKEEPER_WEB", "DAMKEEPER_API") ?? "http://localhost:3000").replace(/\/$/, ""),
  rpc: () => {
    const url = get("DAMKEEPER_RPC_URL", "NEXT_PUBLIC_TESTNET_RPC_URL");
    if (!url) throw new CliError("No RPC endpoint configured.", "Set DAMKEEPER_RPC_URL (a free Alchemy key for Robinhood Chain Testnet works).");
    return url;
  },
  lock: () => need("NEXT_PUBLIC_LOCK_MANAGER_ADDRESS", "DAMKEEPER_LOCK_MANAGER"),
  vesting: () => need("NEXT_PUBLIC_VESTING_MANAGER_ADDRESS", "DAMKEEPER_VESTING_MANAGER"),
};

function need(...keys: string[]) {
  const v = keys.map((k) => get(k)).find(Boolean);
  if (!v) throw new CliError("Contract address isn't configured.", `Set ${keys[keys.length - 1]}. Addresses are listed in packages/config/manifest.testnet.json.`);
  return v as `0x${string}`;
}

export function publicClient() {
  return createPublicClient({ chain: TESTNET, transport: http(cfg.rpc()) });
}

import { loadSession } from "./session";

export function account() {
  const raw = process.env.DAMKEEPER_PRIVATE_KEY;
  if (raw) {
    const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
    try {
      return privateKeyToAccount(key);
    } catch {
      throw new CliError("DAMKEEPER_PRIVATE_KEY isn't a valid private key.", "It should be 64 hex characters, optionally starting with 0x.");
    }
  }

  const session = loadSession();
  if (session?.deviceKey) {
    return privateKeyToAccount(session.deviceKey);
  }

  throw new CliError(
    "No wallet or active session found.",
    "Run `damkeeper login` to authenticate with Phantom / Web3 wallet, or export DAMKEEPER_PRIVATE_KEY=0x…"
  );
}

export function walletClient() {
  return createWalletClient({ account: account(), chain: TESTNET, transport: http(cfg.rpc()) });
}
