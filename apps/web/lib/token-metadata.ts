import { erc20Abi, type Chain, type PublicClient, type Transport } from "viem";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tokens } from "@/db/schema";

export interface TokenMeta {
  symbol: string | null;
  name: string | null;
  decimals: number | null;
}

// Token metadata is untrusted input (brief.md 10): cap lengths and strip control
// characters. A token that can't be read must never block indexing its position.
const clean = (s: string | null, max: number) =>
  s ? s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) || null : null;

export async function ensureTokenMetadata(
  client: PublicClient<Transport, Chain>,
  chainId: number,
  address: string
): Promise<TokenMeta> {
  const addr = address.toLowerCase();
  const [existing] = await db
    .select({ symbol: tokens.symbol, name: tokens.name, decimals: tokens.decimals })
    .from(tokens)
    .where(and(eq(tokens.chainId, chainId), eq(tokens.address, addr)))
    .limit(1);
  if (existing) return existing;

  const read = async <T,>(functionName: "symbol" | "name" | "decimals"): Promise<T | null> => {
    try {
      return (await client.readContract({ address: addr as `0x${string}`, abi: erc20Abi, functionName })) as T;
    } catch {
      return null;
    }
  };

  const [symbol, name, decimals] = await Promise.all([read<string>("symbol"), read<string>("name"), read<number>("decimals")]);
  const meta: TokenMeta = {
    symbol: clean(symbol, 16),
    name: clean(name, 64),
    decimals: decimals === null ? null : Number(decimals),
  };

  await db
    .insert(tokens)
    .values({
      chainId,
      address: addr,
      ...meta,
      supportNote: meta.decimals === null ? "Could not read ERC-20 metadata" : null,
    })
    .onConflictDoNothing();

  return meta;
}
