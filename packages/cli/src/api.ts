import { cfg } from "./config";
import { CliError } from "./ui";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${cfg.api}${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  } catch {
    throw new CliError(`Can't reach the Damkeeper API at ${cfg.api}.`, "Is the web app running? Set DAMKEEPER_API to its URL (e.g. https://your-app.vercel.app).");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new CliError(body?.error ?? `API returned ${res.status}.`);
  return body as T;
}
