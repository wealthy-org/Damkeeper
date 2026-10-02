import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createPublicClient, createWalletClient, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CliError } from "./ui";

export const MAINNET: Chain = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://robinhood-mainnet.g.alchemy.com/v2/alch_pplqufRNSY8bryHOV60bT"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
  testnet: false,
};

export const TESTNET: Chain = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://robinhood-testnet.g.alchemy.com/v2/alch_pplqufRNSY8bryHOV60bT"] } },
  blockExplorers: { default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" } },
  testnet: true,
};

export function activeChain(): Chain {
  const chainId = get("DAMKEEPER_CHAIN_ID");
  if (chainId === "46630") return TESTNET;
  return MAINNET;
}

// ── Defaults for standalone usage ──
// Defaults point to Robinhood Chain Mainnet (4663).
export const DEFAULT_DEPLOYMENTS = [
  {
    kind: "lock",
    managerAddress: "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
    version: "0.1.0",
    verifiedSourceUrl: "https://robinhoodchain.blockscout.com/address/0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
    admin: "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681",
    deployBlock: "78024101",
  },
  {
    kind: "vesting",
    managerAddress: "0xC07D54bd8e87442dB58f6A0cCca71489307c70f5",
    version: "0.1.0",
    verifiedSourceUrl: "https://robinhoodchain.blockscout.com/address/0xC07D54bd8e87442dB58f6A0cCca71489307c70f5",
    admin: "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681",
    deployBlock: "78059319",
  },
];

const DEFAULTS: Record<string, string> = {
  DAMKEEPER_API: "https://damkeeper.xyz",
  DAMKEEPER_WEB: "https://damkeeper.xyz",
  DAMKEEPER_RPC_URL: "https://robinhood-mainnet.g.alchemy.com/v2/alch_pplqufRNSY8bryHOV60bT",
  DAMKEEPER_LOCK_MANAGER: "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
  DAMKEEPER_VESTING_MANAGER: "0xC07D54bd8e87442dB58f6A0cCca71489307c70f5",
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
    const url = get("DAMKEEPER_RPC_URL", "NEXT_PUBLIC_MAINNET_RPC_URL", "NEXT_PUBLIC_TESTNET_RPC_URL");
    if (!url) throw new CliError("No RPC endpoint configured.", "Set DAMKEEPER_RPC_URL (a free Alchemy key for Robinhood Chain works).\nYou can also put it in ~/.damkeeper/config:\n  DAMKEEPER_RPC_URL=https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY");
    return url;
  },
  lock: () => need("NEXT_PUBLIC_LOCK_MANAGER_ADDRESS", "DAMKEEPER_LOCK_MANAGER"),
  vesting: () => need("NEXT_PUBLIC_VESTING_MANAGER_ADDRESS", "DAMKEEPER_VESTING_MANAGER"),
};

function need(...keys: string[]) {
  const v = keys.map((k) => get(k)).find(Boolean);
  if (!v) throw new CliError("Contract address isn't configured.", `Set ${keys[keys.length - 1]}. Addresses are listed in packages/config/manifest.mainnet.json.`);
  return v as `0x${string}`;
}

export function publicClient() {
  return createPublicClient({ chain: activeChain(), transport: http(cfg.rpc()) });
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
  return createWalletClient({ account: account(), chain: activeChain(), transport: http(cfg.rpc()) });
}
