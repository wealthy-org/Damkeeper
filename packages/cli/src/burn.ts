import { isAddress, parseAbi, type TransactionReceipt } from "viem";
import { api } from "./api";
import { account, activeChain, publicClient, walletClient } from "./config";
import { ask, confirm, interactive } from "./prompt";
import { c, CliError, kv, ok, out, short, step } from "./ui";
import { formatTokenAmount, safeParseUnits } from "./shared/amounts";

const DEFAULT_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4" as const;
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function burn(uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
]);

type Addr = `0x${string}`;

async function send(label: string, request: () => Promise<`0x${string}`>): Promise<TransactionReceipt> {
  step(label, c.dim("confirm…"));
  let hash: `0x${string}`;
  try {
    hash = await request();
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/reject|denied/i.test(m)) throw new CliError("Rejected — nothing was sent.");
    throw new CliError(
      m.split("\n")[0] || "The transaction couldn't be sent.",
      /insufficient funds/i.test(m) ? "The wallet needs Robinhood Chain ETH for gas." : undefined
    );
  }
  console.log(`      ${c.dim("submitted")} ${short(hash)}`);
  const receipt = await publicClient().waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new CliError(`Reverted onchain (${short(hash)}) — nothing moved.`);
  step(label, `${ok("SUCCESS")} ${c.dim(`block ${receipt.blockNumber}`)}`);
  // On-demand indexing
  api("/api/sync", {
    method: "POST",
    body: JSON.stringify({ txHash: receipt.transactionHash }),
  }).catch(() => null);
  return receipt;
}

export async function burnCmd(o: { token?: string; amount?: string; mode?: string; yes?: boolean }) {
  const acct = account();
  const pc = publicClient();
  const chain = activeChain();

  // 1. Resolve token address
  let tokenRaw = o.token;
  if (!tokenRaw) {
    tokenRaw = interactive()
      ? await ask("Token address (Enter = $DAM)", DEFAULT_TOKEN)
      : DEFAULT_TOKEN;
  }
  tokenRaw = tokenRaw.trim();
  if (!isAddress(tokenRaw)) {
    throw new CliError(`"${tokenRaw}" is not a valid address.`);
  }
  const token = tokenRaw as Addr;

  // 2. Fetch bytecode & verify contract
  const code = await pc.getBytecode({ address: token });
  if (!code || code === "0x") {
    throw new CliError(`Address ${token} is not a contract on ${chain.name} (${chain.id}).`);
  }

  // 3. Read token metadata & balances
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
      pc.readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [acct.address] }),
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

  // 4. Auto-detect native burn() support (selector 0x42966c68)
  const supportsNativeBurn = code.toLowerCase().includes("42966c68");
  let mode: "burn" | "dead" = "burn";

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

  // 5. Amount resolution
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
  let amount: bigint | null = null;
  if (amountRaw.toLowerCase() === "max") {
    amount = balance;
  } else {
    amount = safeParseUnits(amountRaw, decimals);
  }

  if (amount === null || amount === 0n) {
    throw new CliError(`"${amountRaw}" is not a usable amount.`, "Use a positive number like 1000 or 12.5, or \"max\".");
  }
  if (amount > balance) {
    throw new CliError(
      `Amount exceeds your wallet balance (${formatTokenAmount(balance, decimals)} ${symbol}).`,
      `You entered ${formatTokenAmount(amount, decimals)} ${symbol}.`
    );
  }

  // 6. Impact calculation using BigInt scaling (6 decimal places)
  const projectedSupply = mode === "burn" ? (totalSupply > amount ? totalSupply - amount : 0n) : totalSupply;
  const scale = 1_000_000n;
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

  // 7. Review Table
  console.log("");
  kv([
    ["Token", `${name} (${c.lime(symbol)}) · ${decimals} decimals`],
    ["Contract", token],
    ["Mechanism", mode === "burn" ? `${c.lime("Native burn()")} · ERC20Burnable supported` : `${c.yellow("Dead Sink")} · Transfer to 0x...dEaD`],
    ["Amount to burn", `${c.bold(formatTokenAmount(amount, decimals))} ${symbol}`],
    ["Wallet balance after", `${formatTokenAmount(balance - amount, decimals)} ${symbol}`],
    ["Contract total supply", `${formatTokenAmount(totalSupply, decimals)} → ${formatTokenAmount(projectedSupply, decimals)} ${symbol}`],
    ["Total supply contraction", `${c.lime(contractionStr)} (-${formatTokenAmount(amount, decimals)} ${symbol})`],
    ["Network", `${chain.name} (${chain.id})`],
  ]);
  console.log(`\n  ${c.red("⚠")} ${c.bold("Permanent & Irreversible:")} Burned tokens cannot be recovered or refunded.`);
  console.log("");

  // 8. Confirmation
  await confirm(`Burn ${formatTokenAmount(amount, decimals)} ${symbol} permanently?`, Boolean(o.yes));

  // 9. Execute transaction
  const wc = walletClient();
  const receipt = await send(
    mode === "burn" ? "Executing native burn()" : "Transferring to dead sink (0x...dEaD)",
    () =>
      mode === "burn"
        ? wc.writeContract({ address: token, abi: tokenAbi, functionName: "burn", args: [amount!] })
        : wc.writeContract({ address: token, abi: tokenAbi, functionName: "transfer", args: [DEAD_ADDRESS, amount!] })
  );

  // 10. Links and Output
  const explorerUrl = chain.blockExplorers?.default?.url ?? "https://robinhoodchain.blockscout.com";
  const txUrl = `${explorerUrl}/tx/${receipt.transactionHash}`;

  const tweetParams = new URLSearchParams({
    text:
      `🔥 Burned ${formatTokenAmount(amount, decimals)} $${symbol} on Robinhood Chain!\n\n` +
      `Permanently destroyed via @damkeeper_fi\n` +
      `• Contraction: ${contractionStr}\n` +
      `• Mechanism: ${mode === "burn" ? "Native burn()" : "Dead Sink (0x...dEaD)"}\n` +
      `• New Supply: ${formatTokenAmount(projectedSupply, decimals)} $${symbol}\n\n` +
      `#RobinhoodChain #Damkeeper`,
    url: txUrl,
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
      tweetUrl: tweetHref,
    },
    () => {
      console.log(`\n  ${c.lime("✓")} Successfully burned ${c.bold(`${formatTokenAmount(amount, decimals)} ${symbol}`)}`);
      console.log(`    ${c.dim("Proof (Blockscout)")}  ${txUrl}`);
      console.log(`    ${c.dim("Circulating Impact")} ${c.lime(contractionStr)} of total supply`);
      console.log(`    ${c.dim("New Total Supply")}   ${formatTokenAmount(projectedSupply, decimals)} ${symbol}`);
      console.log(`    ${c.dim("Share on X")}         ${tweetHref}`);
      console.log(`    ${c.dim("Verified Onchain")}   Block ${receipt.blockNumber}\n`);
    }
  );
}
