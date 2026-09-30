import { createServer } from "node:http";
import { exec } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { cfg, publicClient, TESTNET } from "./config";
import { c, ok, out, step, CliError } from "./ui";
import { formatEther } from "viem";

const SESSION_DIR = join(homedir(), ".damkeeper");
const SESSION_FILE = join(SESSION_DIR, "session.json");

export interface SessionData {
  deviceKey: `0x${string}`;
  deviceAddress: `0x${string}`;
  authorizedBy: `0x${string}`;
  signature?: string;
  createdAt: number;
}

export function loadSession(): SessionData | null {
  try {
    if (!existsSync(SESSION_FILE)) return null;
    return JSON.parse(readFileSync(SESSION_FILE, "utf8")) as SessionData;
  } catch {
    return null;
  }
}

export function saveSession(data: SessionData) {
  mkdirSync(SESSION_DIR, { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function clearSession(): boolean {
  try {
    if (existsSync(SESSION_FILE)) {
      unlinkSync(SESSION_FILE);
      return true;
    }
  } catch {}
  return false;
}

export function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? `open "${url}"` : process.platform === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

/**
 * Interactive browser loopback login:
 * 1. Creates/loads an ephemeral local device keypair in ~/.damkeeper/session.json
 * 2. Starts a local loopback HTTP server
 * 3. Launches web browser to Vercel/Web App /cli/auth?port=...&pubkey=...
 * 4. User connects Phantom, signs authorization, and browser sends approval back
 * 5. CLI saves session and activates immediate access!
 */
export async function loginWithBrowser(): Promise<SessionData> {
  const current = loadSession();
  const deviceKey = current?.deviceKey ?? generatePrivateKey();
  const deviceAccount = privateKeyToAccount(deviceKey);
  const deviceAddress = deviceAccount.address;

  return new Promise((resolve, reject) => {
    let server: ReturnType<typeof createServer>;

    const timeout = setTimeout(() => {
      if (server) server.close();
      reject(new CliError("Login timed out.", "Please try running `damkeeper login` again."));
    }, 120_000);

    server = createServer((req, res) => {
      // Set CORS headers for browser fetch/redirect
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
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          let authorizedBy = url.searchParams.get("address") as `0x${string}` | null;
          let signature = url.searchParams.get("signature") ?? undefined;

          if (body) {
            try {
              const parsed = JSON.parse(body);
              if (parsed.address) authorizedBy = parsed.address;
              if (parsed.signature) signature = parsed.signature;
            } catch {}
          }

          if (!authorizedBy) {
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h3>Missing wallet address</h3>");
            return;
          }

          const session: SessionData = {
            deviceKey,
            deviceAddress,
            authorizedBy: authorizedBy.toLowerCase() as `0x${string}`,
            signature,
            createdAt: Date.now(),
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
                  <div class="icon-wrap">✓</div>
                  <h2>Authentication Successful!</h2>
                  <p>Wallet <span class="wallet">${authorizedBy.slice(0, 6)}…${authorizedBy.slice(-4)}</span> is now authorized for this terminal session.</p>
                  <div class="cli-box">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #b8f36b; box-shadow: 0 0 8px #b8f36b; display: inline-block;"></span>
                    <span>Please check your CLI terminal now.</span>
                  </div>
                  <p style="margin-top: 24px; margin-bottom: 0; color: #526359; font-size: 12px;">You can safely close this browser window.</p>
                </div>
              </body>
            </html>
          `);

          // Delay closing server slightly so browser completes network read
          setTimeout(() => {
            try { server.close(); } catch {}
          }, 2000);
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

      console.log(`\n  ${c.lime("Opening browser to authenticate with Phantom / Web3 Wallet...")}`);
      console.log(`  ${c.dim("If the browser doesn't open automatically, visit:")}\n  ${c.bold(authUrl)}\n`);

      openBrowser(authUrl);
    });
  });
}
