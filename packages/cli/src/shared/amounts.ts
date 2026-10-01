import { formatUnits, parseUnits } from "viem";

/** Parses a user-typed decimal amount; returns null for anything parseUnits would reject. */
export function safeParseUnits(input: string, decimals: number): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  try {
    return parseUnits(trimmed, decimals);
  } catch {
    return null;
  }
}

/** Display-only formatting — stays in strings/BigInt, never JS Number (brief.md 10). */
export function formatTokenAmount(raw: bigint, decimals: number, maxFraction = 4) {
  const [whole, fraction = ""] = formatUnits(raw, decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}
