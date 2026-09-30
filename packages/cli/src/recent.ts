import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// The indexer runs on a schedule, so a position created a minute ago won't be in
// `positions` yet. We remember what this CLI just created so we can say so, instead
// of leaving the user wondering where it went.
const dir = join(homedir(), ".damkeeper");
const file = join(dir, "recent.json");

export interface Recent { kind: "lock" | "vesting"; id: string; at: number }

function load(): Recent[] {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Recent[]) : [];
  } catch {
    return [];
  }
}

export function remember(r: Omit<Recent, "at">) {
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify([...load().filter((x) => !(x.kind === r.kind && x.id === r.id)), { ...r, at: Date.now() }].slice(-20)));
  } catch {
    // Non-fatal: a read-only home directory just means no "not indexed yet" hint.
  }
}

/** Positions created via this CLI in the last 2 hours that the listing doesn't show yet. */
export function pending(listed: { kind: string; positionId: string }[]) {
  const cutoff = Date.now() - 2 * 3600_000;
  return load().filter((r) => r.at > cutoff && !listed.some((p) => p.kind === r.kind && p.positionId === r.id));
}
