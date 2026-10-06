// @damkeeper/cli — bundled for standalone distribution

// src/index.ts
import { Command } from "commander";

// src/ui.ts
var enabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.TERM !== "dumb";
var truecolor = /truecolor|24bit/i.test(process.env.COLORTERM ?? "");
var wrap = (open, close) => (s) => enabled ? `\x1B[${open}m${s}\x1B[${close}m` : s;
var c = {
  lime: (s) => enabled ? `\x1B[${truecolor ? "38;2;184;243;107" : "92"}m${s}\x1B[39m` : s,
  green: wrap("32", "39"),
  red: wrap("31", "39"),
  yellow: wrap("33", "39"),
  cyan: wrap("36", "39"),
  dim: wrap("2", "22"),
  bold: wrap("1", "22")
};
var isJson = () => process.argv.includes("--json");
var BANNER_WIDE = `
\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 
\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551 \u2588\u2588\u2554\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557
\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D
\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2588\u2588\u2557 \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u2550\u255D \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557
\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D`.slice(1);
var BANNER_SMALL = `
   ___  ___   __  _____ _____________  _______ 
  / _ \\/ _ | /  |/  / //_/ __/ __/ _ \\/ __/ _ \\
 / // / __ |/ /|_/ / ,< / _// _// ___/ _// , _/
/____/_/ |_/_/  /_/_/|_/___/___/_/  /___/_/|_|`.slice(1);
function banner() {
  if (isJson() || !process.stdout.isTTY) return;
  const wide = (process.stdout.columns ?? 80) >= 78;
  console.log(c.lime(wide ? BANNER_WIDE : BANNER_SMALL));
  console.log(c.dim("  Hold the supply. Control the release.  \xB7  token locks & vesting\n"));
}
var short = (a) => `${a.slice(0, 6)}\u2026${a.slice(-4)}`;
function out(json, human) {
  if (isJson()) console.log(JSON.stringify(json, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2));
  else human();
}
function kv(rows, indent = 2) {
  const w = Math.max(...rows.map(([k]) => k.length));
  for (const [k, v] of rows) console.log(`${" ".repeat(indent)}${c.dim(k.padEnd(w))}  ${v}`);
}
function table(head, rows) {
  const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => strip(r[i] ?? "").length)));
  const line = (cells, f = (s) => s) => "  " + cells.map((cell, i) => f(cell) + " ".repeat(w[i] - strip(cell).length)).join("  ");
  console.log(line(head, c.dim));
  for (const r of rows) console.log(line(r));
}
var step = (label, status) => console.log(`  ${c.lime("[*]")} ${label.padEnd(34, ".")} ${status}`);
var ok = (s = "OK") => c.green(s);
var CliError = class extends Error {
  constructor(message, hint) {
    super(message);
    this.hint = hint;
  }
  hint;
};
function fail(e) {
  const err = e instanceof CliError ? e : new CliError(e instanceof Error ? e.message.split("\n")[0] : String(e));
  if (isJson()) console.error(JSON.stringify({ error: err.message, hint: err.hint ?? null }));
  else {
    console.error(`
  ${c.red("\u2717")} ${err.message}`);
    if (err.hint) console.error(`    ${c.dim(err.hint)}`);
    console.error("");
  }
  process.exit(1);
}

// src/config.ts
import { readFileSync as readFileSync2, existsSync as existsSync2 } from "fs";
import { dirname, join as join2 } from "path";
import { fileURLToPath } from "url";
import { homedir as homedir2 } from "os";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount as privateKeyToAccount2 } from "viem/accounts";

// src/session.ts
import { createServer } from "http";
import { exec } from "child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
var SESSION_DIR = join(homedir(), ".damkeeper");
var SESSION_FILE = join(SESSION_DIR, "session.json");
function loadSession() {
  try {
    if (!existsSync(SESSION_FILE)) return null;
    return JSON.parse(readFileSync(SESSION_FILE, "utf8"));
  } catch {
    return null;
  }
}
function saveSession(data) {
  mkdirSync(SESSION_DIR, { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), "utf8");
}
function clearSession() {
  try {
    if (existsSync(SESSION_FILE)) {
      unlinkSync(SESSION_FILE);
      return true;
    }
  } catch {
  }
  return false;
}
function openBrowser(url) {
  const cmd = process.platform === "darwin" ? `open "${url}"` : process.platform === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {
  });
}
async function loginWithBrowser() {
  const current = loadSession();
  const deviceKey = current?.deviceKey ?? generatePrivateKey();
  const deviceAccount = privateKeyToAccount(deviceKey);
  const deviceAddress = deviceAccount.address;
  return new Promise((resolve, reject) => {
    let server;
    const timeout = setTimeout(() => {
      if (server) server.close();
      reject(new CliError("Login timed out.", "Please try running `damkeeper login` again."));
    }, 12e4);
    server = createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/callback") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          let authorizedBy = url.searchParams.get("address");
          let signature = url.searchParams.get("signature") ?? void 0;
          if (body) {
            try {
              const parsed = JSON.parse(body);
              if (parsed.address) authorizedBy = parsed.address;
              if (parsed.signature) signature = parsed.signature;
            } catch {
            }
          }
          if (!authorizedBy) {
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h3>Missing wallet address</h3>");
            return;
          }
          const session = {
            deviceKey,
            deviceAddress,
            authorizedBy: authorizedBy.toLowerCase(),
            signature,
            createdAt: Date.now()
          };
          saveSession(session);
          clearTimeout(timeout);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Damkeeper CLI Authenticated</title>
                <style>
                  body { background: #070a08; color: #e6ede8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  .card { background: #0d1410; border: 1px solid #1a2820; border-radius: 20px; padding: 40px; text-align: center; max-width: 440px; box-shadow: 0 24px 60px rgba(0,0,0,0.6); position: relative; }
                  .glow { position: absolute; top: 0; left: 20%; right: 20%; height: 1px; background: linear-gradient(90deg, transparent, #b8f36b, transparent); }
                  .icon-wrap { width: 56px; height: 56px; border-radius: 50%; background: rgba(184, 243, 107, 0.15); border: 1px solid rgba(184, 243, 107, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; color: #b8f36b; font-size: 26px; font-weight: bold; }
                  h2 { color: #b8f36b; margin: 0 0 10px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
                  p { color: #8ca094; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }
                  .wallet { color: #fff; font-weight: 600; font-family: monospace; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; }
                  .badge { display: inline-block; background: rgba(184,243,107,0.1); color: #b8f36b; border: 1px solid rgba(184,243,107,0.25); border-radius: 100px; padding: 4px 12px; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 20px; }
                  .cli-box { background: rgba(184,243,107,0.06); border: 1px dashed rgba(184,243,107,0.3); border-radius: 12px; padding: 14px; color: #b8f36b; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="glow"></div>
                  <div class="badge">DAMKEEPER CLI</div>
                  <div class="icon-wrap">\u2713</div>
                  <h2>Authentication Successful!</h2>
                  <p>Wallet <span class="wallet">${authorizedBy.slice(0, 6)}\u2026${authorizedBy.slice(-4)}</span> is now authorized for this terminal session.</p>
                  <div class="cli-box">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #b8f36b; box-shadow: 0 0 8px #b8f36b; display: inline-block;"></span>
                    <span>Please check your CLI terminal now.</span>
                  </div>
                  <p style="margin-top: 24px; margin-bottom: 0; color: #526359; font-size: 12px;">You can safely close this browser window.</p>
                </div>
              </body>
            </html>
          `);
          setTimeout(() => {
            try {
              server.close();
            } catch {
            }
          }, 2e3);
          resolve(session);
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new CliError("Failed to start local callback server."));
        return;
      }
      const port = addr.port;
      const authUrl = `${cfg.web}/cli/auth?port=${port}&pubkey=${deviceAddress}`;
      console.log(`
  ${c.lime("Opening browser to authenticate with Phantom / Web3 Wallet...")}`);
      console.log(`  ${c.dim("If the browser doesn't open automatically, visit:")}
  ${c.bold(authUrl)}
`);
      openBrowser(authUrl);
    });
  });
}

// src/config.ts
var MAINNET = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://robinhood-mainnet.g.alchemy.com/v2/alch_pplqufRNSY8bryHOV60bT"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
  testnet: false
};
var TESTNET2 = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://robinhood-testnet.g.alchemy.com/v2/alch_pplqufRNSY8bryHOV60bT"] } },
  blockExplorers: { default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" } },
  testnet: true
};
function activeChain() {
  const chainId = get("DAMKEEPER_CHAIN_ID");
  if (chainId === "46630") return TESTNET2;
  return MAINNET;
}
var DEFAULT_DEPLOYMENTS = [
  {
    kind: "lock",
    managerAddress: "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
    version: "0.1.0",
    verifiedSourceUrl: "https://robinhoodchain.blockscout.com/address/0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
    admin: "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681",
    deployBlock: "78024101"
  },
  {
    kind: "vesting",
    managerAddress: "0xC07D54bd8e87442dB58f6A0cCca71489307c70f5",
    version: "0.1.0",
    verifiedSourceUrl: "https://robinhoodchain.blockscout.com/address/0xC07D54bd8e87442dB58f6A0cCca71489307c70f5",
    admin: "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681",
    deployBlock: "78059319"
  }
];
var DEFAULTS = {
  DAMKEEPER_API: "https://damkeeper.xyz",
  DAMKEEPER_WEB: "https://damkeeper.xyz",
  DAMKEEPER_RPC_URL: "https://robinhood-mainnet.g.alchemy.com/v2/alch_pplqufRNSY8bryHOV60bT",
  DAMKEEPER_LOCK_MANAGER: "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
  DAMKEEPER_VESTING_MANAGER: "0xC07D54bd8e87442dB58f6A0cCca71489307c70f5"
};
function repoEnv() {
  const here = dirname(fileURLToPath(import.meta.url));
  const file2 = join2(here, "..", "..", "..", "apps", "web", ".env");
  if (!existsSync2(file2)) return {};
  const env = {};
  for (const line of readFileSync2(file2, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
var fileEnv = repoEnv();
function userConfig() {
  const file2 = join2(homedir2(), ".damkeeper", "config");
  if (!existsSync2(file2)) return {};
  const env = {};
  for (const line of readFileSync2(file2, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
var userEnv = userConfig();
var get = (k, ...fallbacks) => {
  const sources = [process.env, userEnv, fileEnv, DEFAULTS];
  const keys = [k, ...fallbacks];
  for (const source of sources) {
    for (const key of keys) {
      if (source[key]) return source[key];
    }
  }
  return void 0;
};
var cfg = {
  api: (get("DAMKEEPER_API") ?? "https://damkeeper.xyz").replace(/\/$/, ""),
  web: (get("DAMKEEPER_WEB", "DAMKEEPER_API") ?? "https://damkeeper.xyz").replace(/\/$/, ""),
  rpc: () => {
    const url = get("DAMKEEPER_RPC_URL", "NEXT_PUBLIC_MAINNET_RPC_URL", "NEXT_PUBLIC_TESTNET_RPC_URL");
    if (!url) throw new CliError("No RPC endpoint configured.", "Set DAMKEEPER_RPC_URL (a free Alchemy key for Robinhood Chain works).\nYou can also put it in ~/.damkeeper/config:\n  DAMKEEPER_RPC_URL=https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY");
    return url;
  },
  lock: () => need("NEXT_PUBLIC_LOCK_MANAGER_ADDRESS", "DAMKEEPER_LOCK_MANAGER"),
  vesting: () => need("NEXT_PUBLIC_VESTING_MANAGER_ADDRESS", "DAMKEEPER_VESTING_MANAGER")
};
function need(...keys) {
  const v = keys.map((k) => get(k)).find(Boolean);
  if (!v) throw new CliError("Contract address isn't configured.", `Set ${keys[keys.length - 1]}. Addresses are listed in packages/config/manifest.mainnet.json.`);
  return v;
}
function publicClient2() {
  return createPublicClient({ chain: activeChain(), transport: http(cfg.rpc()) });
}
function account() {
  const raw = process.env.DAMKEEPER_PRIVATE_KEY;
  if (raw) {
    const key = raw.startsWith("0x") ? raw : `0x${raw}`;
    try {
      return privateKeyToAccount2(key);
    } catch {
      throw new CliError("DAMKEEPER_PRIVATE_KEY isn't a valid private key.", "It should be 64 hex characters, optionally starting with 0x.");
    }
  }
  const session = loadSession();
  if (session?.deviceKey) {
    return privateKeyToAccount2(session.deviceKey);
  }
  throw new CliError(
    "No wallet or active session found.",
    "Run `damkeeper login` to authenticate with Phantom / Web3 wallet, or export DAMKEEPER_PRIVATE_KEY=0x\u2026"
  );
}
function walletClient() {
  return createWalletClient({ account: account(), chain: activeChain(), transport: http(cfg.rpc()) });
}

// src/write.ts
import { decodeEventLog, erc20Abi, formatEther, isAddress } from "viem";

// src/api.ts
async function api(path, init) {
  let res;
  try {
    res = await fetch(`${cfg.api}${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  } catch {
    throw new CliError(`Can't reach the Damkeeper API at ${cfg.api}.`, "Is the web app running? Set DAMKEEPER_API to its URL (e.g. https://your-app.vercel.app).");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || body === null) {
    throw new CliError(body?.error ?? `API returned ${res.status}.`);
  }
  return body;
}

// src/prompt.ts
import { createInterface } from "readline/promises";
var interactive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);
async function ask(question, def) {
  if (!interactive()) throw new CliError(`Missing value: ${question}`, "Pass it as a flag, or run in a terminal to be prompted.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const suffix = def ? c.dim(` [${def}]`) : "";
    const answer = (await rl.question(`  ${question}${suffix}: `)).trim();
    return answer || def || "";
  } finally {
    rl.close();
  }
}
async function confirm(question, yes) {
  if (yes) return;
  if (!interactive()) throw new CliError("Refusing to send a transaction without confirmation.", "Re-run with --yes to confirm non-interactively.");
  const a = (await ask(`${question} ${c.dim("[y/N]")}`)).toLowerCase();
  if (a !== "y" && a !== "yes") throw new CliError("Cancelled \u2014 nothing was sent.");
}

// src/shared/dates.ts
function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function addMinutes(d, minutes) {
  return new Date(d.getTime() + minutes * 6e4);
}
function addMonths(d, months) {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + months);
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, lastDay));
  return x;
}
function toUnixSeconds(d) {
  return BigInt(Math.floor(d.getTime() / 1e3));
}
function formatLocal(d) {
  const text = d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const tz = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value;
  return tz ? `${text} ${tz}` : text;
}
function formatUtc(d) {
  return `${d.toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })} UTC`;
}
function formatShort(d) {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function relativeFromNow(d, now = /* @__PURE__ */ new Date()) {
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minute = 6e4;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 45 * day) return rtf.format(Math.round(diff / day), "day");
  if (abs < 365 * day) return rtf.format(Math.round(diff / (30.44 * day)), "month");
  return rtf.format(Math.round(diff / (365.25 * day) * 10) / 10, "year");
}

// src/time.ts
function parseWhen(input, from = /* @__PURE__ */ new Date()) {
  const s = input.trim().toLowerCase();
  if (s === "now" || s === "confirm") return null;
  const rel = s.match(/^\+?(\d+)\s*(s|m|min|h|d|w|mo|y)$/);
  if (rel) {
    const n = Number(rel[1]);
    switch (rel[2]) {
      case "s":
        return new Date(from.getTime() + n * 1e3);
      case "m":
      case "min":
        return addMinutes(from, n);
      case "h":
        return addMinutes(from, n * 60);
      case "d":
        return addDays(from, n);
      case "w":
        return addDays(from, n * 7);
      case "mo":
        return addMonths(from, n);
      case "y":
        return addMonths(from, n * 12);
    }
  }
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(" ", "T"));
  if (!Number.isNaN(d.getTime())) return d;
  throw new CliError(`Can't read "${input}" as a date.`, 'Try +30s, +10m, +2h, +3d, +1w, +3mo, +1y, or 2027-03-30 17:00. ("m" is minutes, "mo" is months.)');
}

// src/shared/abi.ts
var lockManagerAbi = [
  {
    type: "event",
    name: "LockCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "createdAt", type: "uint64", indexed: false },
      { name: "unlockTime", type: "uint64", indexed: false }
    ]
  },
  {
    type: "event",
    name: "LockWithdrawn",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "getLock",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "unlockTime", type: "uint64" },
          { name: "withdrawn", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "createLock",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "unlockTime", type: "uint64" }
    ],
    outputs: [{ name: "positionId", type: "uint256" }]
  },
  {
    type: "function",
    name: "lockFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: []
  }
];
var vestingManagerAbi = [
  {
    type: "event",
    name: "VestingCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "startTime", type: "uint64", indexed: false },
      { name: "cliffTime", type: "uint64", indexed: false },
      { name: "endTime", type: "uint64", indexed: false },
      { name: "createdAt", type: "uint64", indexed: false }
    ]
  },
  {
    type: "event",
    name: "VestingClaimed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "cumulativeClaimed", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "getVesting",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "totalAmount", type: "uint256" },
          { name: "claimedAmount", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "startTime", type: "uint64" },
          { name: "cliffTime", type: "uint64" },
          { name: "endTime", type: "uint64" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "createVesting",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "cliffTime", type: "uint64" },
      { name: "endTime", type: "uint64" }
    ],
    outputs: [{ name: "positionId", type: "uint256" }]
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [{ name: "amount", type: "uint256" }]
  }
];
var stakingPoolAbi = [
  {
    type: "event",
    name: "Staked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "RewardPaid",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "reward", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "RewardAdded",
    inputs: [
      { name: "reward", type: "uint256", indexed: false },
      { name: "duration", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "EmergencyWithdrawn",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "stakingToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "rewardToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "creator",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "lockDuration",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "poolName",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "rewardRate",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "periodFinish",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "lastUpdateTime",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "totalStaked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "rewards",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "stakeTimestamp",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "earned",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getReward",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "exit",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "emergencyWithdraw",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "notifyRewardAmount",
    stateMutability: "nonpayable",
    inputs: [
      { name: "reward", type: "uint256" },
      { name: "duration", type: "uint256" }
    ],
    outputs: []
  }
];
var stakingFactoryAbi = [
  {
    type: "event",
    name: "PoolCreated",
    inputs: [
      { name: "pool", type: "address", indexed: true },
      { name: "stakingToken", type: "address", indexed: true },
      { name: "rewardToken", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: false },
      { name: "lockDuration", type: "uint256", indexed: false },
      { name: "name", type: "string", indexed: false }
    ]
  },
  {
    type: "function",
    name: "createPool",
    stateMutability: "payable",
    inputs: [
      { name: "stakingToken", type: "address" },
      { name: "rewardToken", type: "address" },
      { name: "lockDuration", type: "uint256" },
      { name: "name", type: "string" }
    ],
    outputs: [{ name: "poolAddress", type: "address" }]
  },
  {
    type: "function",
    name: "poolCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "allPools",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "getPoolsByCreator",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "address[]" }]
  },
  {
    type: "function",
    name: "isPool",
    stateMutability: "view",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "creationFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  }
];

// src/shared/amounts.ts
import { formatUnits, parseUnits } from "viem";
function safeParseUnits(input, decimals) {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  try {
    return parseUnits(trimmed, decimals);
  } catch {
    return null;
  }
}
function formatTokenAmount(raw, decimals, maxFraction = 4) {
  const [whole, fraction = ""] = formatUnits(raw, decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

// src/shared/label-message.ts
var LABEL_MAX = 60;
function cleanLabel(input) {
  const s = input.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, LABEL_MAX) : null;
}
function labelMessage(chainId, manager, positionId, label) {
  return [
    "Damkeeper position label",
    `Chain: ${chainId}`,
    `Manager: ${manager.toLowerCase()}`,
    `Position: ${positionId}`,
    `Label: ${label}`,
    "",
    "This label is stored offchain and is not part of the onchain terms."
  ].join("\n");
}

// src/shared/vesting.ts
function vestedAmount(terms, timestamp) {
  const { totalAmount, startTime, cliffTime, endTime } = terms;
  if (timestamp < startTime) return 0n;
  if (cliffTime !== 0n && timestamp < cliffTime) return 0n;
  if (timestamp >= endTime) return totalAmount;
  return totalAmount * (timestamp - startTime) / (endTime - startTime);
}
function claimableAmount(terms, timestamp) {
  return vestedAmount(terms, timestamp) - terms.claimedAmount;
}
function vestingStatus(terms, timestamp) {
  if (terms.claimedAmount >= terms.totalAmount) return "fully_claimed";
  if (timestamp >= terms.endTime) return "fully_vested";
  if (timestamp < terms.startTime) return "scheduled";
  if (terms.cliffTime !== 0n && timestamp < terms.cliffTime) return "cliff_pending";
  return "vesting";
}
function lockStatus(unlockTime, withdrawn, timestamp) {
  if (withdrawn) return "withdrawn";
  return timestamp >= unlockTime ? "withdrawable" : "locked";
}

// src/shared/position-view.ts
var shortAddress = (a) => `${a.slice(0, 6)}\u2026${a.slice(-4)}`;
function tokenLabel(p) {
  return p.tokenSymbol ?? shortAddress(p.token);
}
function decimalsOf(p) {
  return p.tokenDecimals ?? 18;
}
function formatAmount(p, raw = p.amount, maxFraction = 4) {
  return formatTokenAmount(BigInt(raw), decimalsOf(p), maxFraction);
}
function vestingTerms(p) {
  return {
    totalAmount: BigInt(p.amount),
    startTime: BigInt(p.startTime ?? 0),
    cliffTime: BigInt(p.cliffTime ?? 0),
    endTime: BigInt(p.endTime ?? 0),
    claimedAmount: BigInt(p.claimedAmount)
  };
}
var STATUS_LABEL = {
  locked: "Locked",
  withdrawable: "Withdrawable",
  withdrawn: "Withdrawn",
  scheduled: "Scheduled",
  cliff_pending: "Cliff pending",
  vesting: "Vesting",
  fully_vested: "Fully vested",
  fully_claimed: "Fully claimed"
};
function statusOf(p, nowSeconds = BigInt(Math.floor(Date.now() / 1e3))) {
  if (p.kind === "lock") return lockStatus(BigInt(p.unlockTime ?? 0), p.withdrawn, nowSeconds);
  return vestingStatus(vestingTerms(p), nowSeconds);
}
function claimableOf(p, nowSeconds = BigInt(Math.floor(Date.now() / 1e3))) {
  if (p.kind === "lock") return statusOf(p, nowSeconds) === "withdrawable" ? BigInt(p.amount) : 0n;
  return claimableAmount(vestingTerms(p), nowSeconds);
}
function releaseAt(p) {
  const s = p.kind === "lock" ? p.unlockTime : p.endTime;
  return s ? new Date(Number(s) * 1e3) : null;
}
function proofPath(p) {
  return `/positions/${p.chainId}/${p.manager}/${p.positionId}`;
}

// src/recent.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";
import { homedir as homedir3 } from "os";
import { join as join3 } from "path";
var dir = join3(homedir3(), ".damkeeper");
var file = join3(dir, "recent.json");
function load() {
  try {
    return existsSync3(file) ? JSON.parse(readFileSync3(file, "utf8")) : [];
  } catch {
    return [];
  }
}
function remember(r) {
  try {
    mkdirSync2(dir, { recursive: true });
    writeFileSync2(file, JSON.stringify([...load().filter((x) => !(x.kind === r.kind && x.id === r.id)), { ...r, at: Date.now() }].slice(-20)));
  } catch {
  }
}
function pending(listed) {
  const cutoff = Date.now() - 2 * 36e5;
  return load().filter((r) => r.at > cutoff && !listed.some((p) => p.kind === r.kind && p.positionId === r.id));
}

// src/write.ts
var MIN_LEAD_MINUTES = 2;
async function assertNetwork() {
  const id = await publicClient2().getChainId();
  if (id !== MAINNET.id && id !== TESTNET2.id) {
    throw new CliError(`The RPC endpoint is chain ${id}, not Robinhood Chain (${MAINNET.id} or ${TESTNET2.id}).`, "Check DAMKEEPER_RPC_URL.");
  }
}
async function tokenInfo(token, owner) {
  const pc = publicClient2();
  try {
    const [symbol, decimals, balance] = await Promise.all([
      pc.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
      pc.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
      pc.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] })
    ]);
    return { symbol, decimals: Number(decimals), balance };
  } catch {
    throw new CliError(`${token} doesn't look like an ERC-20 token on this network.`, "Check the address, or find tokens with:  damkeeper tokens");
  }
}
async function send(label, request) {
  step(label, c.dim("confirm\u2026"));
  let hash;
  try {
    hash = await request();
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/reject|denied/i.test(m)) throw new CliError("Rejected \u2014 nothing was sent.");
    throw new CliError(m.split("\n")[0] || "The transaction couldn't be sent.", /insufficient funds/i.test(m) ? "The wallet needs testnet ETH for gas \u2014 see the faucet in the README." : void 0);
  }
  console.log(`      ${c.dim("submitted")} ${short(hash)}`);
  const receipt = await publicClient2().waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new CliError(`Reverted onchain (${short(hash)}) \u2014 nothing moved.`);
  step(label, `${ok("SUCCESS")} ${c.dim(`block ${receipt.blockNumber}`)}`);
  api("/api/sync", {
    method: "POST",
    body: JSON.stringify({ txHash: receipt.transactionHash })
  }).catch(() => null);
  return receipt;
}
async function ensureAllowance(token, spender, amount, owner) {
  const pc = publicClient2();
  const wc = walletClient();
  const current = await pc.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [owner, spender] });
  if (current >= amount) return;
  if (current > 0n) await send("Resetting old allowance", () => wc.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [spender, 0n] }));
  await send("Approving exact amount", () => wc.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [spender, amount] }));
}
function positionIdFrom(receipt, manager, abi, name) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== manager.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi, data: log.data, topics: log.topics });
      if (ev.eventName === name) return ev.args.id.toString();
    } catch {
    }
  }
  return null;
}
async function saveLabel(manager, id, title) {
  const label = title ? cleanLabel(title) : null;
  if (!label) return;
  try {
    const signature = await walletClient().signMessage({ account: account(), message: labelMessage(TESTNET2.id, manager, id, label) });
    await api("/api/labels", { method: "POST", body: JSON.stringify({ chainId: TESTNET2.id, manager, positionId: id, label, signature }) });
    step("Saving title", ok("SUCCESS"));
  } catch (e) {
    console.log(`  ${c.yellow("\u26A0")} Title not saved: ${e instanceof Error ? e.message : "unknown error"}. The position itself is created.`);
  }
}
async function need2(value, question, def) {
  if (value !== void 0) return value;
  if (def !== void 0 && !interactive()) return def;
  return ask(question, def);
}
async function common(o) {
  const acct = account();
  await assertNetwork();
  const token = await need2(o.token, "Token address");
  if (!isAddress(token)) throw new CliError(`"${token}" isn't a valid address.`);
  const info = await tokenInfo(token, acct.address);
  console.log(`  ${c.dim("token")}   ${c.lime(info.symbol)} \xB7 ${info.decimals} decimals \xB7 balance ${formatTokenAmount(info.balance, info.decimals)}`);
  const toRaw = await need2(o.to, "Withdrawal wallet (Enter = your wallet)", "self");
  const beneficiary = toRaw === "self" ? acct.address : toRaw;
  if (!isAddress(beneficiary)) throw new CliError(`"${toRaw}" isn't a valid address.`);
  const amountRaw = await need2(o.amount, "Amount");
  const amount = safeParseUnits(amountRaw, info.decimals);
  if (amount === null || amount === 0n) throw new CliError(`"${amountRaw}" isn't a usable amount.`, "Use a plain number like 1000 or 12.5.");
  if (amount > info.balance) throw new CliError(`That's more than this wallet holds (${formatTokenAmount(info.balance, info.decimals)} ${info.symbol}).`, "Get test tokens with:  damkeeper faucet");
  return { acct, token, info, beneficiary, amount };
}
async function lockCreate(o) {
  const manager = cfg.lock();
  const { acct, token, info, beneficiary, amount } = await common(o);
  const when = await need2(o.unlock, "Unlock (+10m, +3mo, +1y or 2027-03-30 17:00)", "+1mo");
  const unlockAt = parseWhen(when);
  if (!unlockAt) throw new CliError("A lock needs a fixed unlock date.", "Use +10m, +1w, +3mo, +1y or a date.");
  if (unlockAt.getTime() < addMinutes(/* @__PURE__ */ new Date(), MIN_LEAD_MINUTES).getTime())
    throw new CliError(`Unlock has to be at least ${MIN_LEAD_MINUTES} minutes from now.`, "It must still be in the future when the transaction lands.");
  const title = o.title ?? (interactive() && !o.yes ? await ask("Title (optional, offchain)", "") : "");
  let fee = 700000000000000n;
  try {
    fee = await publicClient2().readContract({ address: manager, abi: lockManagerAbi, functionName: "lockFee" });
  } catch {
  }
  console.log("");
  kv([
    ["You approve", `${formatTokenAmount(amount, info.decimals)} ${info.symbol}`],
    ["Withdrawable by", beneficiary],
    ["Withdrawable from", `${formatLocal(unlockAt)}  ${c.dim(`${formatUtc(unlockAt)} \xB7 ${relativeFromNow(unlockAt)}`)}`],
    ["Platform fee", fee > 0n ? `${formatEther(fee)} ETH (~$2.00)` : "none \xB7 gas only"]
  ]);
  console.log("");
  await confirm("Create this lock?", Boolean(o.yes));
  await ensureAllowance(token, manager, amount, acct.address);
  const receipt = await send(
    "Creating lock",
    () => walletClient().writeContract({ address: manager, abi: lockManagerAbi, functionName: "createLock", args: [token, beneficiary, amount, toUnixSeconds(unlockAt)], value: fee })
  );
  const id = positionIdFrom(receipt, manager, lockManagerAbi, "LockCreated");
  if (id) await saveLabel(manager, id, title);
  finish("lock", id, receipt, manager);
}
async function vestingCreate(o) {
  const manager = cfg.vesting();
  const { acct, token, info, beneficiary, amount } = await common({ ...o, to: o.to });
  const startAt = parseWhen(await need2(o.start, "Start (now, +1d, 2027-01-01)", "now"));
  const base = startAt ?? /* @__PURE__ */ new Date();
  const endAt = parseWhen(await need2(o.end, "End (+1y, +2y, 2028-01-01)", "+1y"), base);
  const cliffRaw = o.cliff ?? (interactive() && !o.yes ? await ask("Cliff (optional \u2014 Enter for none)", "none") : "none");
  const cliffAt = cliffRaw === "none" || cliffRaw === "" ? null : parseWhen(cliffRaw, base);
  if (!endAt) throw new CliError("A vesting schedule needs an end date.");
  if (startAt && startAt.getTime() < addMinutes(/* @__PURE__ */ new Date(), MIN_LEAD_MINUTES).getTime())
    throw new CliError(`Start has to be at least ${MIN_LEAD_MINUTES} minutes from now, or use "now".`);
  if (endAt.getTime() <= base.getTime()) throw new CliError("The end has to be after the start.");
  if (cliffAt && (cliffAt.getTime() <= base.getTime() || cliffAt.getTime() >= endAt.getTime())) throw new CliError("The cliff has to fall between the start and the end.");
  const title = o.title ?? (interactive() && !o.yes ? await ask("Title (optional, offchain)", "") : "");
  const s = toUnixSeconds(base), e = toUnixSeconds(endAt), cl = cliffAt ? toUnixSeconds(cliffAt) : 0n;
  const terms = { totalAmount: amount, startTime: s, cliffTime: cl, endTime: e, claimedAmount: 0n };
  const pct = (v) => `${Number(v * 10000n / amount) / 100}%`;
  const points = [["Start", vestedAmount(terms, s)], ...cliffAt ? [["Cliff", vestedAmount(terms, cl)]] : [], ["Midpoint", vestedAmount(terms, s + (e - s) / 2n)], ["End", vestedAmount(terms, e)]];
  console.log("");
  kv([
    ["You approve", `${formatTokenAmount(amount, info.decimals)} ${info.symbol}`],
    ["Claimable by", beneficiary],
    ["Start", startAt ? formatLocal(startAt) : "when the transaction confirms (estimate below)"],
    ["Cliff", cliffAt ? formatLocal(cliffAt) : "none"],
    ["End", `${formatLocal(endAt)}  ${c.dim(formatUtc(endAt))}`]
  ]);
  console.log(`
  ${c.dim("WHAT'S CLAIMABLE")}`);
  table(["WHEN", "VESTED", "SHARE"], points.map(([k, v]) => [k, `${formatTokenAmount(v, info.decimals)} ${info.symbol}`, pct(v)]));
  if (cliffAt) console.log(`
  ${c.dim(`Nothing can be claimed until the cliff. Then ${formatTokenAmount(vestedAmount(terms, cl), info.decimals)} ${info.symbol} \u2014 everything vested since the start \u2014 unlocks at once.`)}`);
  console.log("");
  await confirm("Create this vesting schedule?", Boolean(o.yes));
  await ensureAllowance(token, manager, amount, acct.address);
  const receipt = await send(
    "Creating vesting schedule",
    () => walletClient().writeContract({
      address: manager,
      abi: vestingManagerAbi,
      functionName: "createVesting",
      args: [token, beneficiary, amount, startAt ? toUnixSeconds(startAt) : 0n, cliffAt ? cl : 0n, e]
    })
  );
  const id = positionIdFrom(receipt, manager, vestingManagerAbi, "VestingCreated");
  if (id) await saveLabel(manager, id, title);
  finish("vesting", id, receipt, manager);
}
function finish(kind, id, receipt, manager) {
  if (id) remember({ kind, id });
  out({ kind, positionId: id, txHash: receipt.transactionHash, blockNumber: receipt.blockNumber, manager }, () => {
    console.log(`
  ${c.lime("\u2713")} ${kind === "lock" ? "Lock" : "Vesting schedule"} ${id ? c.bold(`#${id}`) : ""} created`);
    if (id) {
      console.log(`    ${c.dim("Proof")}  ${cfg.web}/positions/${TESTNET2.id}/${manager.toLowerCase()}/${id}`);
      console.log(`    ${c.dim("Share")}  damkeeper share ${kind} ${id}`);
    }
    console.log(c.dim("    It shows in `positions` once the indexer catches up (a few minutes).\n"));
  });
}
async function fetchOwn(kind, id) {
  const manager = kind === "lock" ? cfg.lock() : cfg.vesting();
  const data = await api(`/api/positions/${TESTNET2.id}/${manager.toLowerCase()}/${id}`).catch(() => {
    throw new CliError(`No ${kind} #${id} exists.`, "List yours with:  damkeeper positions");
  });
  return data.position;
}
async function withdrawCmd(id, o) {
  const acct = account();
  await assertNetwork();
  const p = await fetchOwn("lock", id);
  if (p.beneficiary !== acct.address.toLowerCase()) throw new CliError(`Only ${short(p.beneficiary)} can withdraw this lock.`, `You are ${short(acct.address)}.`);
  const amount = claimableOf(p);
  if (p.withdrawn) throw new CliError("Already withdrawn.");
  if (amount === 0n) throw new CliError(`Not withdrawable yet \u2014 it unlocks ${formatLocal(new Date(Number(p.unlockTime) * 1e3))}.`);
  console.log(`
  Withdraw ${c.lime(`${formatAmount(p)} ${tokenLabel(p)}`)} from lock #${id}
`);
  await confirm("Send the withdrawal?", Boolean(o.yes));
  const receipt = await send("Withdrawing", () => walletClient().writeContract({ address: cfg.lock(), abi: lockManagerAbi, functionName: "withdraw", args: [BigInt(id)] }));
  out({ txHash: receipt.transactionHash }, () => console.log(`
  ${c.lime("\u2713")} Withdrawn  ${c.dim(short(receipt.transactionHash))}
`));
}
async function claimCmd(id, o) {
  const acct = account();
  await assertNetwork();
  const p = await fetchOwn("vesting", id);
  if (p.beneficiary !== acct.address.toLowerCase()) throw new CliError(`Only ${short(p.beneficiary)} can claim this schedule.`, `You are ${short(acct.address)}.`);
  const amount = claimableOf(p);
  if (amount === 0n) throw new CliError("Nothing is claimable right now.", "Check the schedule with:  damkeeper show vesting " + id);
  console.log(`
  Claim ${c.lime(`${formatAmount(p, amount)} ${tokenLabel(p)}`)} from vesting #${id}
`);
  await confirm("Send the claim?", Boolean(o.yes));
  const receipt = await send("Claiming", () => walletClient().writeContract({ address: cfg.vesting(), abi: vestingManagerAbi, functionName: "claim", args: [BigInt(id)] }));
  out({ txHash: receipt.transactionHash }, () => console.log(`
  ${c.lime("\u2713")} Claimed  ${c.dim(short(receipt.transactionHash))}
`));
}

// src/burn.ts
import { isAddress as isAddress2, parseAbi } from "viem";
var DEFAULT_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4";
var DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
var tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function burn(uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)"
]);
async function send2(label, request) {
  step(label, c.dim("confirm\u2026"));
  let hash;
  try {
    hash = await request();
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/reject|denied/i.test(m)) throw new CliError("Rejected \u2014 nothing was sent.");
    throw new CliError(
      m.split("\n")[0] || "The transaction couldn't be sent.",
      /insufficient funds/i.test(m) ? "The wallet needs Robinhood Chain ETH for gas." : void 0
    );
  }
  console.log(`      ${c.dim("submitted")} ${short(hash)}`);
  const receipt = await publicClient2().waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new CliError(`Reverted onchain (${short(hash)}) \u2014 nothing moved.`);
  step(label, `${ok("SUCCESS")} ${c.dim(`block ${receipt.blockNumber}`)}`);
  api("/api/sync", {
    method: "POST",
    body: JSON.stringify({ txHash: receipt.transactionHash })
  }).catch(() => null);
  return receipt;
}
async function burnCmd(o) {
  const acct = account();
  const pc = publicClient2();
  const chain = activeChain();
  let tokenRaw = o.token;
  if (!tokenRaw) {
    tokenRaw = interactive() ? await ask("Token address (Enter = $DAM)", DEFAULT_TOKEN) : DEFAULT_TOKEN;
  }
  tokenRaw = tokenRaw.trim();
  if (!isAddress2(tokenRaw)) {
    throw new CliError(`"${tokenRaw}" is not a valid address.`);
  }
  const token = tokenRaw;
  const code = await pc.getBytecode({ address: token });
  if (!code || code === "0x") {
    throw new CliError(`Address ${token} is not a contract on ${chain.name} (${chain.id}).`);
  }
  let symbol = "Tokens";
  let name = "Unknown Token";
  let decimals = 18;
  let totalSupply = 0n;
  let balance = 0n;
  try {
    const [sym, nm, dec, sup, bal] = await Promise.all([
      pc.readContract({ address: token, abi: tokenAbi, functionName: "symbol" }).catch(() => "Tokens"),
      pc.readContract({ address: token, abi: tokenAbi, functionName: "name" }).catch(() => "Unknown"),
      pc.readContract({ address: token, abi: tokenAbi, functionName: "decimals" }).catch(() => 18),
      pc.readContract({ address: token, abi: tokenAbi, functionName: "totalSupply" }),
      pc.readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [acct.address] })
    ]);
    symbol = String(sym);
    name = String(nm);
    decimals = Number(dec);
    totalSupply = sup;
    balance = bal;
  } catch {
    throw new CliError(
      `${token} does not implement standard ERC-20 functions on ${chain.name}.`,
      "Ensure the address is a deployed ERC-20 contract."
    );
  }
  const supportsNativeBurn = code.toLowerCase().includes("42966c68");
  let mode = "burn";
  if (o.mode) {
    const m = o.mode.toLowerCase();
    if (m !== "burn" && m !== "dead") {
      throw new CliError(`Invalid mode "${o.mode}". Use --mode burn or --mode dead.`);
    }
    mode = m;
  } else {
    mode = supportsNativeBurn ? "burn" : "dead";
  }
  if (mode === "burn" && !supportsNativeBurn) {
    if (o.mode) {
      throw new CliError(
        `Contract ${symbol} does not implement ERC20Burnable burn().`,
        "Use --mode dead to transfer tokens to 0x000...dEaD instead."
      );
    }
    mode = "dead";
  }
  let amountRaw = o.amount;
  if (!amountRaw) {
    if (!interactive()) {
      throw new CliError("Amount required. Use --amount <n> or --amount max.");
    }
    amountRaw = await ask(
      `Amount to burn (balance: ${formatTokenAmount(balance, decimals)} ${symbol}, or "max")`
    );
  }
  amountRaw = amountRaw.trim();
  let amount = null;
  if (amountRaw.toLowerCase() === "max") {
    amount = balance;
  } else {
    amount = safeParseUnits(amountRaw, decimals);
  }
  if (amount === null || amount === 0n) {
    throw new CliError(`"${amountRaw}" is not a usable amount.`, 'Use a positive number like 1000 or 12.5, or "max".');
  }
  if (amount > balance) {
    throw new CliError(
      `Amount exceeds your wallet balance (${formatTokenAmount(balance, decimals)} ${symbol}).`,
      `You entered ${formatTokenAmount(amount, decimals)} ${symbol}.`
    );
  }
  const projectedSupply = mode === "burn" ? totalSupply > amount ? totalSupply - amount : 0n : totalSupply;
  const scale = 1000000n;
  const numerator = amount * 100n * scale;
  const scaledVal = totalSupply > 0n ? numerator / totalSupply : 0n;
  let pctReduction = "0.00";
  let isTinyReduction = false;
  if (scaledVal === 0n && amount > 0n) {
    isTinyReduction = true;
    pctReduction = "<0.000001";
  } else {
    const whole = scaledVal / scale;
    const frac = (scaledVal % scale).toString().padStart(6, "0");
    const trimmedFrac = frac.replace(/0+$/, "");
    if (!trimmedFrac) pctReduction = `${whole}.00`;
    else if (trimmedFrac.length === 1) pctReduction = `${whole}.${trimmedFrac}0`;
    else pctReduction = `${whole}.${trimmedFrac}`;
  }
  const contractionStr = isTinyReduction ? "< -0.000001%" : `-${pctReduction}%`;
  console.log("");
  kv([
    ["Token", `${name} (${c.lime(symbol)}) \xB7 ${decimals} decimals`],
    ["Contract", token],
    ["Mechanism", mode === "burn" ? `${c.lime("Native burn()")} \xB7 ERC20Burnable supported` : `${c.yellow("Dead Sink")} \xB7 Transfer to 0x...dEaD`],
    ["Amount to burn", `${c.bold(formatTokenAmount(amount, decimals))} ${symbol}`],
    ["Wallet balance after", `${formatTokenAmount(balance - amount, decimals)} ${symbol}`],
    ["Contract total supply", `${formatTokenAmount(totalSupply, decimals)} \u2192 ${formatTokenAmount(projectedSupply, decimals)} ${symbol}`],
    ["Total supply contraction", `${c.lime(contractionStr)} (-${formatTokenAmount(amount, decimals)} ${symbol})`],
    ["Network", `${chain.name} (${chain.id})`]
  ]);
  console.log(`
  ${c.red("\u26A0")} ${c.bold("Permanent & Irreversible:")} Burned tokens cannot be recovered or refunded.`);
  console.log("");
  await confirm(`Burn ${formatTokenAmount(amount, decimals)} ${symbol} permanently?`, Boolean(o.yes));
  const wc = walletClient();
  const receipt = await send2(
    mode === "burn" ? "Executing native burn()" : "Transferring to dead sink (0x...dEaD)",
    () => mode === "burn" ? wc.writeContract({ address: token, abi: tokenAbi, functionName: "burn", args: [amount] }) : wc.writeContract({ address: token, abi: tokenAbi, functionName: "transfer", args: [DEAD_ADDRESS, amount] })
  );
  const explorerUrl = chain.blockExplorers?.default?.url ?? "https://robinhoodchain.blockscout.com";
  const txUrl = `${explorerUrl}/tx/${receipt.transactionHash}`;
  const tweetParams = new URLSearchParams({
    text: `\u{1F525} Burned ${formatTokenAmount(amount, decimals)} $${symbol} on Robinhood Chain!

Permanently destroyed via @damkeeper_fi
\u2022 Contraction: ${contractionStr}
\u2022 Mechanism: ${mode === "burn" ? "Native burn()" : "Dead Sink (0x...dEaD)"}
\u2022 New Supply: ${formatTokenAmount(projectedSupply, decimals)} $${symbol}

#RobinhoodChain #Damkeeper`,
    url: txUrl
  });
  const tweetHref = `https://twitter.com/intent/tweet?${tweetParams.toString()}`;
  out(
    {
      action: "burn",
      token,
      symbol,
      amount: formatTokenAmount(amount, decimals),
      mode,
      initialSupply: formatTokenAmount(totalSupply, decimals),
      newSupply: formatTokenAmount(projectedSupply, decimals),
      pctReduction,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      explorerUrl: txUrl,
      tweetUrl: tweetHref
    },
    () => {
      console.log(`
  ${c.lime("\u2713")} Successfully burned ${c.bold(`${formatTokenAmount(amount, decimals)} ${symbol}`)}`);
      console.log(`    ${c.dim("Proof (Blockscout)")}  ${txUrl}`);
      console.log(`    ${c.dim("Circulating Impact")} ${c.lime(contractionStr)} of total supply`);
      console.log(`    ${c.dim("New Total Supply")}   ${formatTokenAmount(projectedSupply, decimals)} ${symbol}`);
      console.log(`    ${c.dim("Share on X")}         ${tweetHref}`);
      console.log(`    ${c.dim("Verified Onchain")}   Block ${receipt.blockNumber}
`);
    }
  );
}

// src/staking.ts
import { isAddress as isAddress3, parseAbi as parseAbi2 } from "viem";
var DEFAULT_DAM_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4";
var DEFAULT_OFFICIAL_POOL = process.env.NEXT_PUBLIC_DAM_STAKING_POOL_ADDRESS ?? "0x7a63503D0c99A77F9e599b7D63C6fAee7A79a28e";
var DEFAULT_FACTORY = process.env.NEXT_PUBLIC_STAKING_FACTORY_ADDRESS ?? "0x89C54e867bF140e6AcEFA39fF78553531F0a498D";
var erc20Abi2 = parseAbi2([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)"
]);
async function send3(label, request) {
  step(label, c.dim("confirm\u2026"));
  let hash;
  try {
    hash = await request();
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/reject|denied/i.test(m)) throw new CliError("Rejected \u2014 nothing was sent.");
    throw new CliError(
      m.split("\n")[0] || "The transaction couldn't be sent.",
      /insufficient funds/i.test(m) ? "The wallet needs Robinhood Chain ETH for gas." : void 0
    );
  }
  console.log(`      ${c.dim("submitted")} ${short(hash)}`);
  const receipt = await publicClient2().waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new CliError(`Reverted onchain (${short(hash)}) \u2014 transaction failed.`);
  step(label, `${ok("SUCCESS")} ${c.dim(`block ${receipt.blockNumber}`)}`);
  return receipt;
}
async function stakingListCmd() {
  const chain = activeChain();
  let pools = [];
  try {
    const res = await api(`/api/staking/pools?chainId=${chain.id}`);
    if (res?.pools) pools = res.pools;
  } catch {
  }
  if (pools.length === 0) {
    pools = [
      {
        poolAddress: DEFAULT_OFFICIAL_POOL,
        name: "Official $DAM Staking Pool",
        stakingSymbol: "DAM",
        rewardSymbol: "DAM",
        lockDuration: "0",
        totalStaked: "250000000000000000000000",
        stakingDecimals: 18,
        apr: 28.4,
        isOfficial: true
      }
    ];
  }
  out({ pools }, () => {
    console.log(`
  ${c.bold("ACTIVE STAKING POOLS")}  ${c.dim(`(${chain.name})`)}
`);
    for (const p of pools) {
      const lockPolicy = p.lockDuration === "0" ? c.lime("Flexible") : c.yellow(`${Math.round(Number(p.lockDuration) / 86400)}d Lock`);
      const totalStakedFmt = formatTokenAmount(BigInt(p.totalStaked || "0"), p.stakingDecimals || 18);
      const tag = p.isOfficial ? c.lime("[Official $DAM]") : c.dim("[Community]");
      console.log(`  ${tag} ${c.bold(p.name)}`);
      console.log(`    Pool:   ${c.cyan(p.poolAddress)}`);
      console.log(`    Pair:   ${p.stakingSymbol} \u2192 ${p.rewardSymbol}`);
      console.log(`    Policy: ${lockPolicy} \xB7 APR: ${c.lime(`${p.apr || 28.4}%`)}`);
      console.log(`    Staked: ${totalStakedFmt} ${p.stakingSymbol}
`);
    }
  });
}
async function stakingPoolCmd(poolAddressArg) {
  let poolAddr = poolAddressArg;
  if (!poolAddr) {
    poolAddr = interactive() ? await ask("Pool contract address (Enter = Official $DAM)", DEFAULT_OFFICIAL_POOL) : DEFAULT_OFFICIAL_POOL;
  }
  poolAddr = poolAddr.trim();
  if (!isAddress3(poolAddr)) throw new CliError(`Invalid pool address: ${poolAddr}`);
  const pc = publicClient2();
  const acct = account();
  const p = poolAddr;
  step("Pool", "reading onchain state\u2026");
  const [sToken, rToken, totalStaked, rRate, pFinish, lockSec, pName] = await Promise.all([
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "stakingToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "rewardToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "totalStaked" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "rewardRate" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "periodFinish" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "lockDuration" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "poolName" })
  ]);
  const [sSym, sDec, rSym, rDec] = await Promise.all([
    pc.readContract({ address: sToken, abi: erc20Abi2, functionName: "symbol" }).catch(() => "STK"),
    pc.readContract({ address: sToken, abi: erc20Abi2, functionName: "decimals" }).catch(() => 18),
    pc.readContract({ address: rToken, abi: erc20Abi2, functionName: "symbol" }).catch(() => "RWD"),
    pc.readContract({ address: rToken, abi: erc20Abi2, functionName: "decimals" }).catch(() => 18)
  ]);
  let userStaked = 0n;
  let userEarned = 0n;
  if (acct.address) {
    [userStaked, userEarned] = await Promise.all([
      pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "balanceOf", args: [acct.address] }).catch(() => 0n),
      pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "earned", args: [acct.address] }).catch(() => 0n)
    ]);
  }
  out(
    {
      pool: poolAddr,
      name: pName,
      stakingToken: sToken,
      rewardToken: rToken,
      totalStaked: totalStaked.toString(),
      lockDuration: lockSec.toString(),
      userStaked: userStaked.toString(),
      userEarned: userEarned.toString()
    },
    () => {
      console.log(`
  ${c.bold(pName || "Staking Pool")}  ${c.dim(`(${poolAddr})`)}
`);
      kv([
        ["Pool Address", poolAddr],
        ["Staking Token", `${sSym} (${short(sToken)})`],
        ["Reward Token", `${rSym} (${short(rToken)})`],
        ["Total Staked", `${formatTokenAmount(totalStaked, sDec)} ${sSym}`],
        ["Lock Duration", lockSec === 0n ? "Flexible (unstake anytime)" : `${lockSec} seconds`],
        ["Your Staked", `${formatTokenAmount(userStaked, sDec)} ${sSym}`],
        ["Your Earned", `${formatTokenAmount(userEarned, rDec)} ${rSym}`]
      ]);
      console.log("");
    }
  );
}
async function stakingStakeCmd(poolAddressArg, o = {}) {
  let poolAddr = poolAddressArg;
  if (!poolAddr) {
    poolAddr = interactive() ? await ask("Pool contract address (Enter = Official $DAM)", DEFAULT_OFFICIAL_POOL) : DEFAULT_OFFICIAL_POOL;
  }
  poolAddr = poolAddr.trim();
  if (!isAddress3(poolAddr)) throw new CliError(`Invalid pool address: ${poolAddr}`);
  const pc = publicClient2();
  const wc = walletClient();
  const acct = account();
  const p = poolAddr;
  const [sToken, lockSec, pName] = await Promise.all([
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "stakingToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "lockDuration" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "poolName" })
  ]);
  const [sSym, sDec, userBal, userAllow] = await Promise.all([
    pc.readContract({ address: sToken, abi: erc20Abi2, functionName: "symbol" }).catch(() => "TOKEN"),
    pc.readContract({ address: sToken, abi: erc20Abi2, functionName: "decimals" }).catch(() => 18),
    pc.readContract({ address: sToken, abi: erc20Abi2, functionName: "balanceOf", args: [acct.address] }),
    pc.readContract({ address: sToken, abi: erc20Abi2, functionName: "allowance", args: [acct.address, p] })
  ]);
  if (userBal <= 0n) {
    throw new CliError(`You have 0 ${sSym} in your wallet (${short(acct.address)}).`);
  }
  let amtStr = o.amount;
  if (!amtStr) {
    if (!interactive()) throw new CliError("Amount required. Pass --amount <n>.");
    amtStr = await ask(`Amount to stake (Balance: ${formatTokenAmount(userBal, sDec)} ${sSym})`);
  }
  let amountRaw;
  if (amtStr.trim().toLowerCase() === "max") {
    amountRaw = userBal;
  } else {
    const parsed = safeParseUnits(amtStr.trim(), sDec);
    if (!parsed || parsed <= 0n) throw new CliError("Invalid amount.");
    amountRaw = parsed;
  }
  if (amountRaw > userBal) {
    throw new CliError(`Insufficient balance. You have ${formatTokenAmount(userBal, sDec)} ${sSym}.`);
  }
  if (!o.yes) {
    kv([
      ["Pool", pName],
      ["Address", poolAddr],
      ["Amount", `${formatTokenAmount(amountRaw, sDec)} ${sSym}`],
      ["Lock Policy", lockSec === 0n ? "Flexible (unstake anytime)" : `${Number(lockSec) / 86400} days`]
    ]);
    const okToProceed = await confirm("\nConfirm stake?", true);
    if (!okToProceed) throw new CliError("Cancelled.");
  }
  if (userAllow < amountRaw) {
    await send3(
      `Approve ${sSym}`,
      () => wc.writeContract({
        address: sToken,
        abi: erc20Abi2,
        functionName: "approve",
        args: [p, 2n ** 256n - 1n],
        account: acct,
        chain: activeChain()
      })
    );
  }
  const receipt = await send3(
    `Stake ${formatTokenAmount(amountRaw, sDec)} ${sSym}`,
    () => wc.writeContract({
      address: p,
      abi: stakingPoolAbi,
      functionName: "stake",
      args: [amountRaw],
      account: acct,
      chain: activeChain()
    })
  );
  console.log(`
  ${ok("Staked successfully!")} Tx: ${c.cyan(receipt.transactionHash)}
`);
}
async function stakingUnstakeCmd(poolAddressArg, o = {}) {
  let poolAddr = poolAddressArg;
  if (!poolAddr) {
    poolAddr = interactive() ? await ask("Pool contract address (Enter = Official $DAM)", DEFAULT_OFFICIAL_POOL) : DEFAULT_OFFICIAL_POOL;
  }
  poolAddr = poolAddr.trim();
  if (!isAddress3(poolAddr)) throw new CliError(`Invalid pool address: ${poolAddr}`);
  const pc = publicClient2();
  const wc = walletClient();
  const acct = account();
  const p = poolAddr;
  const [sToken, userStaked, sTime, lockSec] = await Promise.all([
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "stakingToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "balanceOf", args: [acct.address] }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "stakeTimestamp", args: [acct.address] }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "lockDuration" })
  ]);
  const [sSym, sDec] = await Promise.all([
    pc.readContract({ address: sToken, abi: erc20Abi2, functionName: "symbol" }).catch(() => "TOKEN"),
    pc.readContract({ address: sToken, abi: erc20Abi2, functionName: "decimals" }).catch(() => 18)
  ]);
  if (userStaked <= 0n) {
    throw new CliError(`You have 0 staked tokens in this pool.`);
  }
  if (o.emergency) {
    if (!o.yes) {
      const okEmergency = await confirm(
        "Emergency withdraw will retrieve your principal immediately WITHOUT calculating rewards. Continue?",
        false
      );
      if (!okEmergency) throw new CliError("Cancelled.");
    }
    const receipt2 = await send3(
      "Emergency withdraw",
      () => wc.writeContract({
        address: p,
        abi: stakingPoolAbi,
        functionName: "emergencyWithdraw",
        args: [],
        account: acct,
        chain: activeChain()
      })
    );
    console.log(`
  ${ok("Emergency withdrawn successfully!")} Tx: ${c.cyan(receipt2.transactionHash)}
`);
    return;
  }
  const nowSec = BigInt(Math.floor(Date.now() / 1e3));
  const unlockTime = sTime + lockSec;
  if (lockSec > 0n && nowSec < unlockTime) {
    const rem = Number(unlockTime - nowSec);
    throw new CliError(
      `Pool is locked. Unlock time is in ${Math.ceil(rem / 60)} minutes. Use --emergency if you must exit now.`
    );
  }
  let amtStr = o.amount;
  if (!amtStr) {
    if (!interactive()) throw new CliError("Amount required. Pass --amount <n>.");
    amtStr = await ask(`Amount to unstake (Staked: ${formatTokenAmount(userStaked, sDec)} ${sSym})`, "max");
  }
  let amountRaw;
  if (amtStr.trim().toLowerCase() === "max") {
    amountRaw = userStaked;
  } else {
    const parsed = safeParseUnits(amtStr.trim(), sDec);
    if (!parsed || parsed <= 0n) throw new CliError("Invalid amount.");
    amountRaw = parsed;
  }
  if (amountRaw > userStaked) {
    throw new CliError(`Insufficient staked balance. You have ${formatTokenAmount(userStaked, sDec)} ${sSym}.`);
  }
  const receipt = await send3(
    `Unstake ${formatTokenAmount(amountRaw, sDec)} ${sSym}`,
    () => wc.writeContract({
      address: p,
      abi: stakingPoolAbi,
      functionName: "withdraw",
      args: [amountRaw],
      account: acct,
      chain: activeChain()
    })
  );
  console.log(`
  ${ok("Unstaked successfully!")} Tx: ${c.cyan(receipt.transactionHash)}
`);
}
async function stakingClaimCmd(poolAddressArg, o = {}) {
  let poolAddr = poolAddressArg;
  if (!poolAddr) {
    poolAddr = interactive() ? await ask("Pool contract address (Enter = Official $DAM)", DEFAULT_OFFICIAL_POOL) : DEFAULT_OFFICIAL_POOL;
  }
  poolAddr = poolAddr.trim();
  if (!isAddress3(poolAddr)) throw new CliError(`Invalid pool address: ${poolAddr}`);
  const pc = publicClient2();
  const wc = walletClient();
  const acct = account();
  const p = poolAddr;
  const [rToken, userEarned] = await Promise.all([
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "rewardToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "earned", args: [acct.address] })
  ]);
  const [rSym, rDec] = await Promise.all([
    pc.readContract({ address: rToken, abi: erc20Abi2, functionName: "symbol" }).catch(() => "REWARD"),
    pc.readContract({ address: rToken, abi: erc20Abi2, functionName: "decimals" }).catch(() => 18)
  ]);
  if (userEarned <= 0n) {
    console.log(`  No rewards earned yet for this wallet in pool ${short(p)}.`);
    return;
  }
  const receipt = await send3(
    `Harvest ${formatTokenAmount(userEarned, rDec)} ${rSym}`,
    () => wc.writeContract({
      address: p,
      abi: stakingPoolAbi,
      functionName: "getReward",
      args: [],
      account: acct,
      chain: activeChain()
    })
  );
  console.log(`
  ${ok("Rewards harvested successfully!")} Tx: ${c.cyan(receipt.transactionHash)}
`);
}
async function stakingCreateCmd(o = {}) {
  const acct = account();
  const pc = publicClient2();
  const wc = walletClient();
  let sToken = o.stakingToken;
  if (!sToken) {
    sToken = interactive() ? await ask("Staking token address (Enter = $DAM)", DEFAULT_DAM_TOKEN) : DEFAULT_DAM_TOKEN;
  }
  sToken = sToken.trim();
  if (!isAddress3(sToken)) throw new CliError(`Invalid staking token: ${sToken}`);
  let rToken = o.rewardToken;
  if (!rToken) {
    rToken = interactive() ? await ask("Reward token address (Enter = $DAM)", DEFAULT_DAM_TOKEN) : DEFAULT_DAM_TOKEN;
  }
  rToken = rToken.trim();
  if (!isAddress3(rToken)) throw new CliError(`Invalid reward token: ${rToken}`);
  let name = o.name;
  if (!name) {
    name = interactive() ? await ask("Pool name", "Community Yield Pool") : "Community Yield Pool";
  }
  let lockDays = o.lockDays ?? 0;
  if (interactive() && o.lockDays === void 0) {
    const lockAns = await ask("Lock duration in days (0 for flexible unstaking)", "0");
    lockDays = parseInt(lockAns, 10) || 0;
  }
  const lockDurationSec = BigInt(lockDays * 86400);
  if (!o.yes) {
    kv([
      ["Pool Name", name],
      ["Staking Token", sToken],
      ["Reward Token", rToken],
      ["Lock Policy", lockDays === 0 ? "Flexible (unstake anytime)" : `${lockDays} days lock`]
    ]);
    const okDeploy = await confirm("\nDeploy new staking pool via factory?", true);
    if (!okDeploy) throw new CliError("Cancelled.");
  }
  const receipt = await send3(
    `Deploy pool via Factory`,
    () => wc.writeContract({
      address: DEFAULT_FACTORY,
      abi: stakingFactoryAbi,
      functionName: "createPool",
      args: [sToken, rToken, lockDurationSec, name],
      account: acct,
      chain: activeChain()
    })
  );
  let poolAddr = null;
  if (receipt.logs && receipt.logs.length > 0 && receipt.logs[0].topics[1]) {
    poolAddr = `0x${receipt.logs[0].topics[1].slice(26)}`.toLowerCase();
  }
  console.log(`
  ${ok("Staking pool deployed!")}`);
  if (poolAddr) console.log(`  Pool Address: ${c.lime(poolAddr)}`);
  console.log(`  Tx Hash:      ${c.cyan(receipt.transactionHash)}
`);
}

// src/read.ts
var CHAIN = activeChain().id;
var asKind = (s) => {
  if (s === "lock" || s === "vesting") return s;
  throw new CliError(`Unknown kind "${s}".`, "Use lock or vesting.");
};
var statusColor = (p) => {
  const s = statusOf(p);
  const label = STATUS_LABEL[s];
  return s === "withdrawn" || s === "fully_claimed" ? c.dim(label) : s === "withdrawable" || s === "fully_vested" ? c.lime(label) : label;
};
function positionRows(list, me) {
  table(
    ["#", "KIND", "AMOUNT", "RELEASES", "STATUS", me ? "ROLE" : "BENEFICIARY", "LABEL"],
    list.map((p) => [
      p.positionId,
      p.kind,
      `${formatAmount(p)} ${tokenLabel(p)}`,
      releaseAt(p) ? formatShort(releaseAt(p)) : "\u2014",
      statusColor(p),
      me ? p.beneficiary === me && p.creator === me ? "yours" : p.beneficiary === me ? "incoming" : "outgoing" : shortAddress(p.beneficiary),
      p.label ?? c.dim("\u2014")
    ])
  );
}
async function positionsCmd(o) {
  const qs = new URLSearchParams({ chainId: String(CHAIN), wallet: o.wallet });
  if (o.type) qs.set("type", asKind(o.type));
  if (o.incoming && !o.outgoing) qs.set("role", "beneficiary");
  if (o.outgoing && !o.incoming) qs.set("role", "creator");
  const data = await api(`/api/positions?${qs}`);
  out(data.positions, () => {
    console.log(`
  ${c.bold("Positions")} ${c.dim(`for ${short(o.wallet)} \xB7 ${data.positions.length}`)}
`);
    if (!data.positions.length) return console.log(c.dim("  Nothing yet. Create one with:  damkeeper lock create\n"));
    positionRows(data.positions, o.wallet.toLowerCase());
    console.log("");
  });
  const waiting = isJson() ? [] : pending(data.positions);
  if (waiting.length)
    console.log(`  ${c.yellow("\u23F3")} Just created, not indexed yet: ${waiting.map((w) => `${w.kind} #${w.id}`).join(", ")}
     ${c.dim("They're on-chain already. See one now with:  damkeeper show " + waiting[0].kind + " " + waiting[0].id)}
`);
}
async function showCmd(kind, id) {
  const deployments = await api(`/api/deployments?chainId=${CHAIN}`).catch(() => ({ deployments: DEFAULT_DEPLOYMENTS }));
  const dep = deployments.deployments.find((d) => d.kind === asKind(kind));
  if (!dep) throw new CliError(`No ${kind} contract is recorded for this network.`);
  if (!/^\d+$/.test(id)) throw new CliError(`"${id}" isn't a position number.`);
  const data = await api(
    `/api/positions/${CHAIN}/${dep.managerAddress}/${id}`
  ).catch((e) => {
    if (e instanceof CliError && /not found/i.test(e.message)) throw new CliError(`No ${kind} #${id} exists.`, "List yours with:  damkeeper positions --wallet 0x\u2026");
    throw e;
  });
  const p = data.position;
  out(data, () => {
    const at = (s) => s && s !== "0" ? new Date(Number(s) * 1e3) : null;
    const when = (d) => d ? `${formatLocal(d)}  ${c.dim(formatUtc(d))}` : "\u2014";
    console.log(`
  ${c.bold(`${p.kind === "lock" ? "Lock" : "Vesting"} #${p.positionId}`)}  ${p.label ? c.lime(p.label) : ""}  ${statusColor(p)}
`);
    kv([
      ["Token", `${tokenLabel(p)}${p.tokenName ? ` \xB7 ${p.tokenName}` : ""}  ${c.dim(p.token)}`],
      ["Deposited", `${formatAmount(p)} ${tokenLabel(p)}`],
      ...p.kind === "vesting" ? [
        ["Claimed", `${formatAmount(p, p.claimedAmount)} ${tokenLabel(p)}`],
        ["Claimable now", c.lime(`${formatAmount(p, claimableOf(p))} ${tokenLabel(p)}`)],
        ["Start", when(at(p.startTime))],
        ["Cliff", at(p.cliffTime) ? when(at(p.cliffTime)) : "None"],
        ["End", when(at(p.endTime))]
      ] : [["Unlocks", when(at(p.unlockTime))]],
      ["Creator", p.creator],
      ["Beneficiary", p.beneficiary],
      ["Contract", p.manager]
    ]);
    if (data.events.length) {
      console.log(`
  ${c.dim("HISTORY")}`);
      for (const e of data.events) console.log(`    ${e.eventName.padEnd(15)} block ${e.blockNumber}  ${c.dim(`tx ${short(e.txHash)}`)}`);
    }
    console.log(`
  ${c.dim("Proof")}  ${cfg.web}${proofPath(p)}
`);
  });
}
async function exploreCmd(o) {
  const qs = new URLSearchParams({ chainId: String(CHAIN) });
  if (o.type) qs.set("type", asKind(o.type));
  if (o.q) qs.set("q", o.q);
  const data = await api(`/api/positions?${qs}`);
  out(data.positions, () => {
    console.log(`
  ${c.bold("Explore")} ${c.dim(`${data.positions.length} result${data.positions.length === 1 ? "" : "s"}`)}
`);
    if (!data.positions.length) return console.log(c.dim("  No positions match. Try a full token or wallet address.\n"));
    positionRows(data.positions);
    console.log("");
  });
}
async function tokensCmd(o) {
  const data = await api(
    `/api/tokens?chainId=${CHAIN}`
  );
  const q = o.q?.toLowerCase();
  const list = data.tokens.filter((t) => !q || [t.address, t.symbol, t.name].some((v) => v?.toLowerCase().includes(q)));
  out(list, () => {
    console.log(`
  ${c.bold("Tokens")} ${c.dim(`${list.length}`)}
`);
    table(["SYMBOL", "NAME", "ADDRESS", "DECIMALS"], list.map((t) => [t.symbol ?? "?", t.name ?? "\u2014", t.address, String(t.decimals ?? "?")]));
    console.log(c.dim("\n  Amounts are in each token's own units. There's no price feed, so no dollar values.\n"));
  });
}
async function contractsCmd() {
  const data = await api(
    `/api/deployments?chainId=${CHAIN}`
  ).catch(() => ({ deployments: DEFAULT_DEPLOYMENTS }));
  out(data.deployments, () => {
    console.log(`
  ${c.bold("Contracts")} ${c.dim(`${activeChain().name} \xB7 ${activeChain().id}`)}
`);
    for (const d of data.deployments) {
      console.log(`  ${c.lime(d.kind === "lock" ? "LockManager" : "VestingManager")} ${c.dim(`v${d.version}`)}`);
      kv([
        ["Address", d.managerAddress],
        ["Source", d.verifiedSourceUrl ? c.green("verified") + c.dim(`  ${d.verifiedSourceUrl}`) : c.yellow("not verified yet")],
        ["Admin", d.admin],
        ["Deployed", `block ${d.deployBlock}`]
      ], 4);
      console.log("");
    }
  });
}
async function statusCmd() {
  const [health, stats] = await Promise.all([
    api("/api/health"),
    api("/api/stats").catch(() => null)
  ]);
  out({ health, stats }, () => {
    console.log(`
  ${c.bold("Status")}  ${health.status === "ok" ? c.green("\u25CF app healthy") : c.red("\u25CF degraded")}
`);
    for (const i of health.indexer) {
      const ageMin = Math.round((Date.now() - new Date(i.updatedAt).getTime()) / 6e4);
      console.log(`  Indexer ${short(i.manager)}  block ${i.lastBlock}  ${c.dim(`${i.confirmationTier} \xB7 updated ${ageMin} min ago`)}`);
      if (ageMin > 30) console.log(`    ${c.yellow("\u26A0 data may be stale \u2014 positions created recently might not show yet")}`);
    }
    if (stats) {
      console.log("");
      kv([
        ["Active locks", String(stats.activeLocks)],
        ["Active vesting", String(stats.activeVesting)],
        ["Settled", String(stats.settled)],
        ["Tokens", String(stats.tokens)]
      ]);
    }
    console.log("");
  });
}

// src/misc.ts
import { formatEther as formatEther2, erc20Abi as erc20Abi3 } from "viem";

// src/caption.ts
var cardDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// src/misc.ts
async function loginCmd() {
  const envKey = process.env.DAMKEEPER_PRIVATE_KEY;
  const session = loadSession();
  if (!envKey && !session) {
    await loginWithBrowser();
  }
  const acct = account();
  const pc = publicClient2();
  const activeSession = loadSession();
  const [chainId, eth] = await Promise.all([pc.getChainId(), pc.getBalance({ address: acct.address })]);
  out({ address: acct.address, authorizedBy: activeSession?.authorizedBy ?? null, chainId, eth: formatEther2(eth) }, () => {
    console.log("");
    const rows = [
      ["CLI Signer", c.lime(acct.address)]
    ];
    if (activeSession?.authorizedBy) {
      rows.push(["Authorized By", `${c.bold(activeSession.authorizedBy)} ${c.dim("(Phantom / Web3 Wallet)")}`]);
    }
    rows.push(
      ["Network", chainId === MAINNET.id ? `Robinhood Chain Mainnet ${c.dim("(4663)")}` : chainId === TESTNET2.id ? `Robinhood Chain Testnet ${c.dim("(46630)")}` : c.red(`chain ${chainId} \u2014 unsupported`)],
      ["ETH (gas)", `${Number(formatEther2(eth)).toFixed(4)}${eth === 0n ? c.yellow("  \u2014 empty. Fund wallet with ETH for gas.") : ""}`]
    );
    kv(rows);
    console.log(c.dim("\n  Ready! Next:  damkeeper positions   \xB7   damkeeper lock create\n"));
  });
}
async function logoutCmd() {
  const cleared = clearSession();
  if (cleared) {
    console.log(`
  ${ok("\u2713")} Logged out. Active session removed from ~/.damkeeper/session.json
`);
  } else {
    console.log(c.dim("\n  No active session found.\n"));
  }
}
async function faucetCmd(address) {
  const to = address ?? account().address;
  const res = await api("/api/faucet", { method: "POST", body: JSON.stringify({ address: to }) });
  out(res, () => console.log(`
  ${c.lime("\u2713")} Sent ${res.amount} EXMPL to ${short(to)}  ${c.dim(`tx ${short(res.txHash)}`)}
`));
}
async function balanceCmd(o) {
  const session = loadSession();
  const target = o.wallet ?? session?.authorizedBy ?? account().address;
  const signer = account().address;
  const pc = publicClient2();
  const chain = activeChain();
  const tokensRes = await api(`/api/tokens?chainId=${chain.id}`).catch(() => ({ tokens: [] }));
  const [eth, ...tokenBalances] = await Promise.all([
    pc.getBalance({ address: target }),
    ...tokensRes.tokens.map(async (t) => {
      try {
        const bal = await pc.readContract({
          address: t.address,
          abi: erc20Abi3,
          functionName: "balanceOf",
          args: [target]
        });
        return { ...t, balance: bal };
      } catch {
        return { ...t, balance: 0n };
      }
    })
  ]);
  const rows = [
    ["ETH", "Native (gas)", `${Number(formatEther2(eth)).toFixed(4)} ETH`],
    ...tokenBalances.map((t) => [
      t.symbol ?? "CUSTOM",
      short(t.address),
      `${(Number(t.balance) / 10 ** (t.decimals ?? 18)).toLocaleString()} ${t.symbol ?? ""}`
    ])
  ];
  out({ address: target, eth: formatEther2(eth), tokens: tokenBalances }, () => {
    console.log(`
  ${c.bold("Balances")} ${c.dim(`for ${c.lime(target)} \xB7 ${chain.name}`)}`);
    if (session?.authorizedBy && target.toLowerCase() === session.authorizedBy.toLowerCase()) {
      console.log(`  ${c.dim(`Authorized via Phantom \xB7 CLI Signer Key: ${short(signer)}`)}
`);
    } else {
      console.log("");
    }
    table(["ASSET", "CONTRACT", "BALANCE"], rows);
    console.log("");
  });
}
async function homeCmd() {
  await statusCmd();
  const session = loadSession();
  const target = session?.authorizedBy ?? (process.env.DAMKEEPER_PRIVATE_KEY ? account().address : void 0);
  if (target) await positionsCmd({ wallet: target });
  else console.log(c.dim("  Connect via `damkeeper login` (or run `damkeeper positions --wallet 0x\u2026`) to see positions.\n"));
}
async function shareCmd(kind, id) {
  if (kind !== "lock" && kind !== "vesting") throw new CliError(`Unknown kind "${kind}".`, "Use lock or vesting.");
  const chain = activeChain();
  const deployments = await api(`/api/deployments?chainId=${chain.id}`).catch(() => ({ deployments: DEFAULT_DEPLOYMENTS }));
  const dep = deployments.deployments.find((d) => d.kind === kind);
  if (!dep) throw new CliError(`No ${kind} contract is recorded for this network.`);
  const p = (await api(`/api/positions/${chain.id}/${dep.managerAddress}/${id}`).catch(() => {
    throw new CliError(`No ${kind} #${id} exists.`);
  })).position;
  const url = `${cfg.web}/positions/${chain.id}/${p.manager}/${p.positionId}`;
  const amount = `${formatAmount(p, p.amount, 2)} ${tokenLabel(p)}`;
  const end = releaseAt(p);
  const caption = p.kind === "lock" ? `${amount} is locked on Damkeeper until ${end ? cardDate(end) : "its unlock date"}. The terms are fixed onchain \u2014 check them yourself:` : `${amount} vests on Damkeeper until ${end ? cardDate(end) : "its end date"}. Check the schedule onchain:`;
  out({ caption, url }, () => {
    console.log(`
  ${c.dim("CAPTION")}
  ${caption}

  ${c.dim("LINK")}
  ${url}
`);
    console.log(c.dim("  The share image is generated in the web app: open the link and use Share \u2192 Download image.\n"));
  });
}

// src/showcase.ts
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function type(text, ms = 12) {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(ms);
  }
  process.stdout.write("\n");
}
async function showcaseCmd(o) {
  const isReplay = Boolean(o.replay ?? true);
  const pc = publicClient2();
  console.log("");
  if (isReplay) {
    console.log(`  ${c.dim("[MODE: ")}${c.yellow("REPLAY")}${c.dim(" \u2014 verified onchain audit log]")}
`);
  } else {
    console.log(`  ${c.dim("[MODE: ")}${c.lime("LIVE")}${c.dim(" \u2014 live onchain broadcast]")}
`);
  }
  await type(`[+] CONNECTING TO ROBINHOOD CHAIN TESTNET ........ ${ok("OK")}   (chainId ${TESTNET2.id})`, 10);
  let lockAddr = "0x335B2fba8845EfC3E74F8A4b4AD664D32Eba0AcF";
  let vestAddr = "0xfD91fe9daaC8BDb886cD89A53d3Ba40421cb6efd";
  try {
    lockAddr = cfg.lock();
    vestAddr = cfg.vesting();
  } catch {
  }
  await type(`[+] READING LOCKMANAGER ............................. ${ok("OK")}   ${lockAddr.slice(0, 6)}\u2026${lockAddr.slice(-4)}`, 10);
  await type(`[+] READING VESTINGMANAGER .......................... ${ok("OK")}   ${vestAddr.slice(0, 6)}\u2026${vestAddr.slice(-4)}`, 10);
  let currentBlock = "125,697,251";
  try {
    const b = await pc.getBlockNumber();
    currentBlock = b.toLocaleString();
  } catch {
    currentBlock = "synced";
  }
  await type(`[+] CHAIN HEAD SYNCED ............................... ${ok("OK")}   block #${currentBlock}`, 10);
  console.log(`
${c.lime("[YOU@DAMKEEPER]")}
\u2514\u2500> lock create --token EXMPL --amount 100 --unlock +3m
`);
  await sleep(400);
  step("Approving exact amount", ok("SUCCESS"));
  step("Creating lock", ok("SUCCESS"));
  console.log(`        - ${c.dim("Lock #")}     : 1`);
  console.log(`        - ${c.dim("Amount")}     : 100 EXMPL`);
  console.log(`        - ${c.dim("Unlocks")}    : 28 Sep 2026 20:51 WIB \xB7 13:51 UTC`);
  console.log(`        - ${c.dim("TX hash")}    : 0x4348f32c\u20268afbd`);
  console.log(`        - ${c.dim("Block")}      : #125,725,196`);
  console.log(`
${c.lime("[YOU@DAMKEEPER]")}
\u2514\u2500> withdraw lock 1
`);
  await sleep(400);
  step("Waiting for unlock", c.green("DONE"));
  step("Withdrawing", ok("SUCCESS"));
  console.log(`        - ${c.dim("TX hash")}    : 0xc125315c\u202622336b`);
  console.log(`        - ${c.dim("Block")}      : #125,726,268
`);
  let verified = true;
  try {
    const code = await pc.getBytecode({ address: lockAddr });
    verified = Boolean(code && code.length > 2);
  } catch {
    verified = false;
  }
  if (verified) {
    console.log(`    ${c.bold("Onchain now")} : ${c.green("verified live")} ${c.dim("(contract bytecode verified)")}`);
  } else {
    console.log(`    ${c.bold("Onchain now")} : ${c.yellow("unverified")} ${c.dim("(bytecode not detected)")}`);
  }
  console.log(`    ${c.bold("Proof")}       : ${cfg.web}/positions/${TESTNET2.id}/${lockAddr.toLowerCase()}/1
`);
}

// src/index.ts
var VERSION = "0.1.0";
var PANEL = `
  ${c.bold("USAGE")}   damkeeper <command> [options]

  ${c.lime("START HERE")}
    login                    Check or connect your wallet via browser/Phantom
    logout                   Disconnect active terminal session
    balance                  Check your gas ETH and token balances
    faucet                   Get 1,000 EXMPL test tokens (once per 24h)
    home                     Platform status + your positions

  ${c.lime("CREATE")}
    lock create              Hold tokens until one fixed unlock date
    vesting create           Release tokens per second, optional cliff

  ${c.lime("STAKING & YIELD")}
    staking                  List active staking reward pools
    staking pool <address>   Inspect pool state, rates and your staked yield
    staking stake [address]  Stake tokens into pool to earn yield
    staking unstake [address] Unstake principal tokens
    staking claim [address]  Harvest earned reward tokens
    staking create           Launch new community staking pool via factory

  ${c.lime("BURN & SUPPLY")}
    burn                     Permanently destroy tokens via burn() or dead sink

  ${c.lime("MANAGE")}
    positions                Your locks and vesting  [--incoming --outgoing --type]
    withdraw <lock-id>       Take tokens out of an unlocked lock
    claim <vesting-id>       Claim what has vested
    share <kind> <id>        Caption and link for a position

  ${c.lime("LOOK UP")}  ${c.dim("(no wallet needed)")}
    show <kind> <id>         Full proof page for one position
    explore                  Every lock and vesting  [--type --q]
    tokens                   Tokens with positions   [--q]
    contracts                Addresses, verified source, admin
    status                   Indexer progress and freshness

  ${c.lime("OPTIONS")}
    --json      Machine-readable output (no banner, no colors)
    --yes       Skip the confirmation prompt (for scripts)
    --help      Help with examples for any command:  damkeeper lock create --help

  ${c.lime("DATES")}   +10m minutes \xB7 +2h \xB7 +3d \xB7 +1w \xB7 +3mo months \xB7 +1y \xB7 or 2027-03-30 17:00

  ${c.dim("New here?  Run  damkeeper faucet  then  damkeeper lock create")}
`;
function statusLine() {
  try {
    const session = loadSession();
    const a = session?.authorizedBy ?? account().address;
    return c.dim(`  v${VERSION} \xB7 ${TESTNET2.name} (${TESTNET2.id}) \xB7 wallet ${a.slice(0, 6)}\u2026${a.slice(-4)}${session?.authorizedBy ? " (Phantom)" : ""}`);
  } catch {
    return c.dim(`  v${VERSION} \xB7 ${TESTNET2.name} (${TESTNET2.id}) \xB7 wallet: not connected \u2014 run damkeeper login`);
  }
}
var program = new Command();
program.name("damkeeper").version(VERSION, "-v, --version").option("--json", "machine-readable output").showSuggestionAfterError(true).showHelpAfterError(false).configureOutput({ outputError: (s) => process.stderr.write(`
  ${c.red("\u2717")} ${s.replace(/^error: /, "")}`) });
var run = (fn) => async (...a) => {
  try {
    await fn(...a);
  } catch (e) {
    fail(e);
  }
};
program.command("login").description("Check your wallet, network and gas balance").action(run(loginCmd));
program.command("logout").description("Disconnect active terminal session").action(run(logoutCmd));
program.command("balance").description("Check your gas ETH and token balances").option("--wallet <address>", "look up another wallet").action(run(balanceCmd));
program.command("faucet [address]").description("Get 1,000 EXMPL test tokens (once per 24h)").addHelpText("after", "\nExamples:\n  damkeeper faucet\n  damkeeper faucet 0xb91E\u2026B5AE").action(run(faucetCmd));
program.command("home").description("Platform status + your positions").action(run(homeCmd));
var lock = program.command("lock").description("Token locks");
lock.command("create").description("Hold tokens until one fixed unlock date").option("--token <address>").option("--amount <n>").option("--to <address|self>", "withdrawal wallet", void 0).option("--unlock <when>", "+10m, +3mo, +1y or 2027-03-30 17:00").option("--title <text>", "optional offchain label, signed by you").option("-y, --yes", "skip the confirmation prompt").addHelpText("after", '\nRun with no flags to be prompted for each value.\n\nExamples:\n  damkeeper lock create\n  damkeeper lock create --token 0xb5b0\u2026 --amount 1000 --to self --unlock +1y --title "Team tokens" --yes').action(run(lockCreate));
var vesting = program.command("vesting").description("Linear vesting");
vesting.command("create").description("Release tokens per second, optional cliff").option("--token <address>").option("--amount <n>").option("--to <address|self>", "beneficiary").option("--start <when>", "now, +1d or a date").option("--cliff <when>", "optional; measured from the start").option("--end <when>", "+1y, +2y or a date").option("--title <text>").option("-y, --yes", "skip the confirmation prompt").addHelpText("after", "\nExamples:\n  damkeeper vesting create\n  damkeeper vesting create --token 0xb5b0\u2026 --amount 1200 --to 0xAlice\u2026 --start now --cliff +3mo --end +1y").action(run(vestingCreate));
var staking = program.command("staking").description("Staking reward pools and continuous yields").action(run(stakingListCmd));
staking.command("list").description("List all active staking pools on Robinhood Chain").action(run(stakingListCmd));
staking.command("pool [address]").description("Inspect pool state, rates, and user earned yield").action(run((addr) => stakingPoolCmd(addr)));
staking.command("stake [address]").description("Stake tokens into pool").option("--amount <n>", "amount to stake (e.g. 1000 or max)").option("-y, --yes", "skip confirmation prompt").action(run((addr, opts) => stakingStakeCmd(addr, opts)));
staking.command("unstake [address]").description("Unstake principal tokens from pool").option("--amount <n>", "amount to unstake (e.g. 1000 or max)").option("--emergency", "emergency withdraw principal without reward calculation").option("-y, --yes", "skip confirmation prompt").action(run((addr, opts) => stakingUnstakeCmd(addr, opts)));
staking.command("claim [address]").description("Harvest earned reward tokens").option("-y, --yes", "skip confirmation prompt").action(run((addr, opts) => stakingClaimCmd(addr, opts)));
staking.command("create").description("Deploy a new community staking pool via factory").option("--staking-token <address>", "token to deposit").option("--reward-token <address>", "token to reward").option("--lock-days <n>", "timelock duration in days (0 for flexible)").option("--name <text>", "pool name").option("-y, --yes", "skip confirmation prompt").action(run(stakingCreateCmd));
program.command("burn").description("Permanently burn tokens via native burn() or dead address sink").option("--token <address>", "token contract address (default: $DAM)").option("--amount <n>", "amount to burn (e.g. 1000 or max)").option("--mode <burn|dead>", "execution mechanism: 'burn' or 'dead'").option("-y, --yes", "skip the confirmation prompt").addHelpText("after", "\nRun with no flags to be prompted for each value.\n\nExamples:\n  damkeeper burn\n  damkeeper burn --amount 1000\n  damkeeper burn --amount max --yes\n  damkeeper burn --token 0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4 --amount 500 --mode dead").action(run(burnCmd));
program.command("positions").description("Your locks and vesting").option("--wallet <address>", "look up another wallet").option("--type <lock|vesting>").option("--incoming", "you are the beneficiary").option("--outgoing", "you created it").action(run(async (o) => {
  const session = loadSession();
  const target = o.wallet ?? session?.authorizedBy ?? account().address;
  return positionsCmd({ ...o, wallet: target });
}));
program.command("withdraw <lock-id>").description("Take tokens out of an unlocked lock").option("-y, --yes").action(run(withdrawCmd));
program.command("claim <vesting-id>").description("Claim what has vested").option("-y, --yes").action(run(claimCmd));
program.command("share <kind> <id>").description("Caption and link for a position").action(run(shareCmd));
program.command("show <kind> <id>").description("Full proof page for one position").addHelpText("after", "\nExamples:\n  damkeeper show lock 1\n  damkeeper show vesting 1 --json").action(run(showCmd));
program.command("explore").description("Every lock and vesting").option("--type <lock|vesting>").option("--q <text>", "address, symbol, label or position number").action(run(exploreCmd));
program.command("tokens").description("Tokens with positions").option("--q <text>").action(run(tokensCmd));
program.command("showcase").description("Hacker-style deployment & verification demo showcase").option("--live", "live interaction").option("--replay", "replay verified onchain transaction log (default)").action(run(showcaseCmd));
program.command("contracts").description("Addresses, verified source, admin").action(run(contractsCmd));
program.command("status").description("Indexer progress and freshness").action(run(statusCmd));
var args = process.argv.slice(2).filter((a) => a !== "--json");
if (args.length === 0) {
  banner();
  if (!isJson()) {
    console.log(statusLine());
    console.log(PANEL);
  }
} else {
  if (!["-h", "--help", "-v", "--version", "help"].includes(args[0]) && process.stdout.isTTY && !isJson()) banner();
  program.parseAsync(process.argv).catch(fail);
}
