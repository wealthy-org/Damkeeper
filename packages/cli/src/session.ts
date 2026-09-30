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
                  body { background: #0c0e12; color: #fff; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  .card { background: #14171f; border: 1px solid #232836; border-radius: 12px; padding: 32px; text-align: center; max-width: 420px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
                  h2 { color: #b8f36b; margin-top: 0; font-size: 20px; }
                  p { color: #9da3ae; font-size: 14px; line-height: 1.5; }
                  .badge { display: inline-block; background: rgba(184,243,107,0.1); color: #b8f36b; border: 1px solid rgba(184,243,107,0.25); border-radius: 20px; padding: 4px 12px; font-size: 12px; margin-bottom: 16px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="badge">Damkeeper CLI</div>
                  <h2>✓ Successfully Authenticated!</h2>
                  <p>Wallet <strong>${authorizedBy.slice(0, 6)}…${authorizedBy.slice(-4)}</strong> authorized this terminal session.</p>
                  <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">You can close this tab and return to your terminal.</p>
                </div>
              </body>
            </html>
          `);

          server.close();
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
