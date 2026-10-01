import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
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

// ── Defaults for standalone usage ──
// These are hardcoded so a globally installed CLI works out of the box.
// Users only need to override DAMKEEPER_RPC_URL if they have their own Alchemy key.
export const DEFAULT_DEPLOYMENTS = [
  {
    kind: "lock",
    managerAddress: "0x335B2fba8845EfC3E74F8A4b4AD664D32Eba0AcF",
    version: "0.1.0",
    verifiedSourceUrl: "https://explorer.testnet.chain.robinhood.com/address/0x335b2fba8845efc3e74f8a4b4ad664d32eba0acf",
    admin: "0xe0945d83EA2d1A0FfeF588748c67FCa88acc99A5",
    deployBlock: "125692754",
  },
  {
    kind: "vesting",
    managerAddress: "0xfD91fe9daaC8BDb886cD89A53d3Ba40421cb6efd",
    version: "0.1.0",
    verifiedSourceUrl: "https://explorer.testnet.chain.robinhood.com/address/0xfd91fe9daac8bdb886cd89a53d3ba40421cb6efd",
    admin: "0xe0945d83EA2d1A0FfeF588748c67FCa88acc99A5",
    deployBlock: "125692760",
  },
];

const DEFAULTS: Record<string, string> = {
  DAMKEEPER_API: "https://damkeeper.xyz",
  DAMKEEPER_WEB: "https://damkeeper.xyz",
  DAMKEEPER_RPC_URL: "https://explorer.testnet.chain.robinhood.com/api/eth-rpc",
  DAMKEEPER_LOCK_MANAGER: "0x335B2fba8845EfC3E74F8A4b4AD664D32Eba0AcF",
  DAMKEEPER_VESTING_MANAGER: "0xfD91fe9daaC8BDb886cD89A53d3Ba40421cb6efd",
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

// Also load from ~/.damkeeper/config if it exists (standalone users can put their RPC key here).
function userConfig(): Record<string, string> {
  const file = join(homedir(), ".damkeeper", "config");
  if (!existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const userEnv = userConfig();

const get = (k: string, ...fallbacks: string[]) => {
  // Priority: process.env > ~/.damkeeper/config > repo .env > hardcoded defaults
  const sources = [process.env, userEnv, fileEnv, DEFAULTS];
  const keys = [k, ...fallbacks];
  for (const source of sources) {
    for (const key of keys) {
      if (source[key]) return source[key];
    }
  }
  return undefined;
};

export const cfg = {
  api: (get("DAMKEEPER_API") ?? "https://damkeeper.xyz").replace(/\/$/, ""),
  web: (get("DAMKEEPER_WEB", "DAMKEEPER_API") ?? "https://damkeeper.xyz").replace(/\/$/, ""),
  rpc: () => {
    const url = get("DAMKEEPER_RPC_URL", "NEXT_PUBLIC_TESTNET_RPC_URL");
    if (!url) throw new CliError("No RPC endpoint configured.", "Set DAMKEEPER_RPC_URL (a free Alchemy key for Robinhood Chain Testnet works).\nYou can also put it in ~/.damkeeper/config:\n  DAMKEEPER_RPC_URL=https://rhn-testnet.g.alchemy.com/v2/YOUR_KEY");
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
