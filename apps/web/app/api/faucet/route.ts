import { createPublicClient, createWalletClient, http, isAddress, parseUnits, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "@/db/client";
import { faucetClaims } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { robinhoodTestnet } from "@/lib/chains";

// Testnet-only convenience faucet so a new tester doesn't have to ask someone to
// manually `cast send` them EXMPL (brief.md phase 3 wants 10 test wallets — this is
// how they'd actually get funded without a human in the loop every time).
// FAUCET_PRIVATE_KEY is server-only (no NEXT_PUBLIC_ prefix) — never sent to the browser.
const CLAIM_AMOUNT = "1000"; // EXMPL, human units
const COOLDOWN_HOURS = 24;

export async function POST(request: Request) {
  const faucetKey = process.env.FAUCET_PRIVATE_KEY as `0x${string}` | undefined;
  const tokenAddress = process.env.NEXT_PUBLIC_FAUCET_TOKEN_ADDRESS as `0x${string}` | undefined;

  if (!faucetKey || !tokenAddress) {
    return Response.json(
      { error: "Faucet not configured on this deployment (FAUCET_PRIVATE_KEY / NEXT_PUBLIC_FAUCET_TOKEN_ADDRESS missing)." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const to = body?.address as string | undefined;
  if (!to || !isAddress(to)) {
    return Response.json({ error: "A valid wallet address is required." }, { status: 400 });
  }

  const chainId = robinhoodTestnet.id;
  const existing = await db
    .select()
    .from(faucetClaims)
    .where(and(eq(faucetClaims.chainId, chainId), eq(faucetClaims.address, to.toLowerCase())))
    .limit(1);

  if (existing[0]) {
    const elapsedMs = Date.now() - existing[0].lastClaimedAt.getTime();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const retryAfterMinutes = Math.ceil((cooldownMs - elapsedMs) / 60000);
      return Response.json(
        { error: `Already claimed. Try again in ${retryAfterMinutes} minute(s).` },
        { status: 429 }
      );
    }
  }

  const account = privateKeyToAccount(faucetKey);
  const publicClient = createPublicClient({ chain: robinhoodTestnet, transport: http() });
  const walletClient = createWalletClient({ account, chain: robinhoodTestnet, transport: http() });

  try {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [to as `0x${string}`, parseUnits(CLAIM_AMOUNT, 18)],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    await db
      .insert(faucetClaims)
      .values({ chainId, address: to.toLowerCase(), txHash: hash })
      .onConflictDoUpdate({
        target: [faucetClaims.chainId, faucetClaims.address],
        set: { lastClaimedAt: new Date(), txHash: hash },
      });

    return Response.json({ txHash: hash, amount: CLAIM_AMOUNT });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Faucet transfer failed." }, { status: 502 });
  }
}
