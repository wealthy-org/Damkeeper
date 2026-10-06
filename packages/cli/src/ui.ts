// Terminal output helpers. Colors turn off automatically when piped, in CI, or with NO_COLOR.
const enabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.TERM !== "dumb";
const truecolor = /truecolor|24bit/i.test(process.env.COLORTERM ?? "");

const wrap = (open: string, close: string) => (s: string) => (enabled ? `\x1b[${open}m${s}\x1b[${close}m` : s);
export const c = {
  lime: (s: string) => (enabled ? `\x1b[${truecolor ? "38;2;184;243;107" : "92"}m${s}\x1b[39m` : s),
  green: wrap("32", "39"),
  red: wrap("31", "39"),
  yellow: wrap("33", "39"),
  cyan: wrap("36", "39"),
  dim: wrap("2", "22"),
  bold: wrap("1", "22"),
};

export const isJson = () => process.argv.includes("--json");

const BANNER_WIDE = `
██████╗  █████╗ ███╗   ███╗██╗  ██╗███████╗███████╗██████╗ ███████╗██████╗ 
██╔══██╗██╔══██╗████╗ ████║██║ ██╔╝██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗
██║  ██║███████║██╔████╔██║█████╔╝ █████╗  █████╗  ██████╔╝█████╗  ██████╔╝
██║  ██║██╔══██║██║╚██╔╝██║██╔═██╗ ██╔══╝  ██╔══╝  ██╔═══╝ ██╔══╝  ██╔══██╗
██████╔╝██║  ██║██║ ╚═╝ ██║██║  ██╗███████╗███████╗██║     ███████╗██║  ██║
╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝`.slice(1);

const BANNER_SMALL = `
   ___  ___   __  _____ _____________  _______ 
  / _ \\/ _ | /  |/  / //_/ __/ __/ _ \\/ __/ _ \\
 / // / __ |/ /|_/ / ,< / _// _// ___/ _// , _/
/____/_/ |_/_/  /_/_/|_/___/___/_/  /___/_/|_|`.slice(1);

export function banner() {
  if (isJson() || !process.stdout.isTTY) return;
  const wide = (process.stdout.columns ?? 80) >= 78;
  console.log(c.lime(wide ? BANNER_WIDE : BANNER_SMALL));
  console.log(c.dim("  Hold the supply. Control the release.  ·  token locks & vesting\n"));
}

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function out(json: unknown, human: () => void) {
  if (isJson()) console.log(JSON.stringify(json, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  else human();
}

export function kv(rows: [string, string][], indent = 2) {
  const w = Math.max(...rows.map(([k]) => k.length));
  for (const [k, v] of rows) console.log(`${" ".repeat(indent)}${c.dim(k.padEnd(w))}  ${v}`);
}

export function table(head: string[], rows: string[][]) {
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => strip(r[i] ?? "").length)));
  const line = (cells: string[], f: (s: string) => string = (s) => s) =>
    "  " + cells.map((cell, i) => f(cell) + " ".repeat(w[i] - strip(cell).length)).join("  ");
  console.log(line(head, c.dim));
  for (const r of rows) console.log(line(r));
}

export const step = (label: string, status: string) => console.log(`  ${c.lime("[*]")} ${label.padEnd(34, ".")} ${status}`);
export const ok = (s = "OK") => c.green(s);

export class CliError extends Error {
  constructor(message: string, public hint?: string) {
    super(message);
  }
}

export function fail(e: unknown): never {
  const err = e instanceof CliError ? e : new CliError(e instanceof Error ? e.message.split("\n")[0] : String(e));
  if (isJson()) console.error(JSON.stringify({ error: err.message, hint: err.hint ?? null }));
  else {
    console.error(`\n  ${c.red("✗")} ${err.message}`);
    if (err.hint) console.error(`    ${c.dim(err.hint)}`);
    console.error("");
  }
  process.exit(1);
}
