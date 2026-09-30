import { createInterface } from "node:readline/promises";
import { c, CliError } from "./ui";

export const interactive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

export async function ask(question: string, def?: string): Promise<string> {
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

/** Confirmation gate before anything that spends gas or moves tokens. --yes skips it. */
export async function confirm(question: string, yes: boolean): Promise<void> {
  if (yes) return;
  if (!interactive()) throw new CliError("Refusing to send a transaction without confirmation.", "Re-run with --yes to confirm non-interactively.");
  const a = (await ask(`${question} ${c.dim("[y/N]")}`)).toLowerCase();
  if (a !== "y" && a !== "yes") throw new CliError("Cancelled — nothing was sent.");
}
