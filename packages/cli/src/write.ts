import { decodeEventLog, erc20Abi, isAddress, type TransactionReceipt } from "viem";
import { api } from "./api";
import { account, cfg, publicClient, TESTNET, walletClient } from "./config";
import { ask, confirm, interactive } from "./prompt";
import { parseWhen } from "./time";
import { c, CliError, kv, out, short, step, ok, table } from "./ui";
import { lockManagerAbi, vestingManagerAbi } from "@/lib/abi";
import { addMinutes, formatLocal, formatUtc, relativeFromNow, toUnixSeconds } from "@/lib/dates";
import { formatTokenAmount, safeParseUnits } from "@/lib/amounts";
import { cleanLabel, labelMessage } from "@/lib/label-message";
import { vestedAmount } from "@damkeeper/domain/vesting";
import { claimableOf, formatAmount, tokenLabel, type PositionView } from "@/lib/position-view";
import { remember } from "./recent";

const MIN_LEAD_MINUTES = 2;
type Addr = `0x${string}`;

async function assertNetwork() {
  const id = await publicClient().getChainId();
  if (id !== TESTNET.id) throw new CliError(`The RPC endpoint is chain ${id}, not Robinhood Chain Testnet (${TESTNET.id}).`, "Check DAMKEEPER_RPC_URL.");
}

async function tokenInfo(token: Addr, owner: Addr) {
  const pc = publicClient();
  try {
    const [symbol, decimals, balance] = await Promise.all([
      pc.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
      pc.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
      pc.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
    ]);
    return { symbol, decimals: Number(decimals), balance };
  } catch {
    throw new CliError(`${token} doesn't look like an ERC-20 token on this network.`, "Check the address, or find tokens with:  damkeeper tokens");
  }
}

/** Sends a transaction and waits for it, printing the same stages the web app shows. */
async function send(label: string, request: () => Promise<`0x${string}`>): Promise<TransactionReceipt> {
  step(label, c.dim("confirm…"));
  let hash: `0x${string}`;
  try {
    hash = await request();
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/reject|denied/i.test(m)) throw new CliError("Rejected — nothing was sent.");
    throw new CliError(m.split("\n")[0] || "The transaction couldn't be sent.", /insufficient funds/i.test(m) ? "The wallet needs testnet ETH for gas — see the faucet in the README." : undefined);
  }
  console.log(`      ${c.dim("submitted")} ${short(hash)}`);
  const receipt = await publicClient().waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new CliError(`Reverted onchain (${short(hash)}) — nothing moved.`);
  step(label, `${ok("SUCCESS")} ${c.dim(`block ${receipt.blockNumber}`)}`);
  return receipt;
}

async function ensureAllowance(token: Addr, spender: Addr, amount: bigint, owner: Addr) {
  const pc = publicClient();
  const wc = walletClient();
  const current = await pc.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [owner, spender] });
  if (current >= amount) return;
  // brief.md 10: USDT-style tokens reject changing a non-zero allowance, so reset to zero first.
  if (current > 0n) await send("Resetting old allowance", () => wc.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [spender, 0n] }));
  await send("Approving exact amount", () => wc.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [spender, amount] }));
}

function positionIdFrom(receipt: TransactionReceipt, manager: string, abi: typeof lockManagerAbi | typeof vestingManagerAbi, name: string) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== manager.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi, data: log.data, topics: log.topics }) as { eventName: string; args: { id: bigint } };
      if (ev.eventName === name) return ev.args.id.toString();
    } catch {
      /* not one of ours */
    }
  }
  return null;
}

/** Optional offchain title, signed by the creator so nobody else can rename the position (POST /api/labels). */
async function saveLabel(manager: string, id: string, title?: string) {
  const label = title ? cleanLabel(title) : null;
  if (!label) return;
  try {
    const signature = await walletClient().signMessage({ account: account(), message: labelMessage(TESTNET.id, manager, id, label) });
    await api("/api/labels", { method: "POST", body: JSON.stringify({ chainId: TESTNET.id, manager, positionId: id, label, signature }) });
    step("Saving title", ok("SUCCESS"));
  } catch (e) {
    console.log(`  ${c.yellow("⚠")} Title not saved: ${e instanceof Error ? e.message : "unknown error"}. The position itself is created.`);
  }
}

// A value given as a flag wins. With a default, scripts (no terminal) just use it;
// in a terminal you're asked, with the default pre-filled. Without a default it's required.
async function need(value: string | undefined, question: string, def?: string) {
  if (value !== undefined) return value;
  if (def !== undefined && !interactive()) return def;
  return ask(question, def);
}

async function common(o: { token?: string; to?: string; amount?: string }) {
  const acct = account();
  await assertNetwork();
  const token = await need(o.token, "Token address");
  if (!isAddress(token)) throw new CliError(`"${token}" isn't a valid address.`);
  const info = await tokenInfo(token, acct.address);
  console.log(`  ${c.dim("token")}   ${c.lime(info.symbol)} · ${info.decimals} decimals · balance ${formatTokenAmount(info.balance, info.decimals)}`);
  const toRaw = await need(o.to, "Withdrawal wallet (Enter = your wallet)", "self");
  const beneficiary = (toRaw === "self" ? acct.address : toRaw) as Addr;
  if (!isAddress(beneficiary)) throw new CliError(`"${toRaw}" isn't a valid address.`);
  const amountRaw = await need(o.amount, "Amount");
  const amount = safeParseUnits(amountRaw, info.decimals);
  if (amount === null || amount === 0n) throw new CliError(`"${amountRaw}" isn't a usable amount.`, "Use a plain number like 1000 or 12.5.");
  if (amount > info.balance) throw new CliError(`That's more than this wallet holds (${formatTokenAmount(info.balance, info.decimals)} ${info.symbol}).`, "Get test tokens with:  damkeeper faucet");
  return { acct, token: token as Addr, info, beneficiary, amount };
}

export async function lockCreate(o: { token?: string; to?: string; amount?: string; unlock?: string; title?: string; yes?: boolean }) {
  const manager = cfg.lock();
  const { acct, token, info, beneficiary, amount } = await common(o);
  const when = await need(o.unlock, "Unlock (+10m, +3mo, +1y or 2027-03-30 17:00)", "+1mo");
  const unlockAt = parseWhen(when);
  if (!unlockAt) throw new CliError("A lock needs a fixed unlock date.", "Use +10m, +1w, +3mo, +1y or a date.");
  if (unlockAt.getTime() < addMinutes(new Date(), MIN_LEAD_MINUTES).getTime())
    throw new CliError(`Unlock has to be at least ${MIN_LEAD_MINUTES} minutes from now.`, "It must still be in the future when the transaction lands.");
  const title = o.title ?? (interactive() && !o.yes ? await ask("Title (optional, offchain)", "") : "");

  console.log("");
  kv([
    ["You approve", `${formatTokenAmount(amount, info.decimals)} ${info.symbol}`],
    ["Withdrawable by", beneficiary],
    ["Withdrawable from", `${formatLocal(unlockAt)}  ${c.dim(`${formatUtc(unlockAt)} · ${relativeFromNow(unlockAt)}`)}`],
    ["Platform fee", "none · gas only"],
  ]);
  console.log("");
  await confirm("Create this lock?", Boolean(o.yes));

  await ensureAllowance(token, manager, amount, acct.address);
  const receipt = await send("Creating lock", () =>
    walletClient().writeContract({ address: manager, abi: lockManagerAbi, functionName: "createLock", args: [token, beneficiary, amount, toUnixSeconds(unlockAt)] })
  );
  const id = positionIdFrom(receipt, manager, lockManagerAbi, "LockCreated");
  if (id) await saveLabel(manager, id, title);
  finish("lock", id, receipt, manager);
}

export async function vestingCreate(o: { token?: string; to?: string; amount?: string; start?: string; cliff?: string; end?: string; title?: string; yes?: boolean }) {
  const manager = cfg.vesting();
  const { acct, token, info, beneficiary, amount } = await common({ ...o, to: o.to });
  const startAt = parseWhen(await need(o.start, "Start (now, +1d, 2027-01-01)", "now"));
  const base = startAt ?? new Date();
  const endAt = parseWhen(await need(o.end, "End (+1y, +2y, 2028-01-01)", "+1y"), base);
  const cliffRaw = o.cliff ?? (interactive() && !o.yes ? await ask("Cliff (optional — Enter for none)", "none") : "none");
  const cliffAt = cliffRaw === "none" || cliffRaw === "" ? null : parseWhen(cliffRaw, base);
  if (!endAt) throw new CliError("A vesting schedule needs an end date.");
  if (startAt && startAt.getTime() < addMinutes(new Date(), MIN_LEAD_MINUTES).getTime())
    throw new CliError(`Start has to be at least ${MIN_LEAD_MINUTES} minutes from now, or use "now".`);
  if (endAt.getTime() <= base.getTime()) throw new CliError("The end has to be after the start.");
  if (cliffAt && (cliffAt.getTime() <= base.getTime() || cliffAt.getTime() >= endAt.getTime())) throw new CliError("The cliff has to fall between the start and the end.");
  const title = o.title ?? (interactive() && !o.yes ? await ask("Title (optional, offchain)", "") : "");

  // Same formula as the contract and the web preview (brief.md 8.5, packages/domain).
  const s = toUnixSeconds(base), e = toUnixSeconds(endAt), cl = cliffAt ? toUnixSeconds(cliffAt) : 0n;
  const terms = { totalAmount: amount, startTime: s, cliffTime: cl, endTime: e, claimedAmount: 0n };
  const pct = (v: bigint) => `${Number((v * 10000n) / amount) / 100}%`;
  const points: [string, bigint][] = [["Start", vestedAmount(terms, s)], ...(cliffAt ? ([["Cliff", vestedAmount(terms, cl)]] as [string, bigint][]) : []), ["Midpoint", vestedAmount(terms, s + (e - s) / 2n)], ["End", vestedAmount(terms, e)]];

  console.log("");
  kv([
    ["You approve", `${formatTokenAmount(amount, info.decimals)} ${info.symbol}`],
    ["Claimable by", beneficiary],
    ["Start", startAt ? formatLocal(startAt) : "when the transaction confirms (estimate below)"],
    ["Cliff", cliffAt ? formatLocal(cliffAt) : "none"],
    ["End", `${formatLocal(endAt)}  ${c.dim(formatUtc(endAt))}`],
  ]);
  console.log(`\n  ${c.dim("WHAT'S CLAIMABLE")}`);
  table(["WHEN", "VESTED", "SHARE"], points.map(([k, v]) => [k, `${formatTokenAmount(v, info.decimals)} ${info.symbol}`, pct(v)]));
  if (cliffAt) console.log(`\n  ${c.dim(`Nothing can be claimed until the cliff. Then ${formatTokenAmount(vestedAmount(terms, cl), info.decimals)} ${info.symbol} — everything vested since the start — unlocks at once.`)}`);
  console.log("");
  await confirm("Create this vesting schedule?", Boolean(o.yes));

  await ensureAllowance(token, manager, amount, acct.address);
  const receipt = await send("Creating vesting schedule", () =>
    walletClient().writeContract({
      address: manager,
      abi: vestingManagerAbi,
      functionName: "createVesting",
      args: [token, beneficiary, amount, startAt ? toUnixSeconds(startAt) : 0n, cliffAt ? cl : 0n, e],
    })
  );
  const id = positionIdFrom(receipt, manager, vestingManagerAbi, "VestingCreated");
  if (id) await saveLabel(manager, id, title);
  finish("vesting", id, receipt, manager);
}

function finish(kind: "lock" | "vesting", id: string | null, receipt: TransactionReceipt, manager: string) {
  if (id) remember({ kind, id });
  out({ kind, positionId: id, txHash: receipt.transactionHash, blockNumber: receipt.blockNumber, manager }, () => {
    console.log(`\n  ${c.lime("✓")} ${kind === "lock" ? "Lock" : "Vesting schedule"} ${id ? c.bold(`#${id}`) : ""} created`);
    if (id) {
      console.log(`    ${c.dim("Proof")}  ${cfg.web}/positions/${TESTNET.id}/${manager.toLowerCase()}/${id}`);
      console.log(`    ${c.dim("Share")}  damkeeper share ${kind} ${id}`);
    }
    console.log(c.dim("    It shows in `positions` once the indexer catches up (a few minutes).\n"));
  });
}

async function fetchOwn(kind: "lock" | "vesting", id: string): Promise<PositionView> {
  const manager = kind === "lock" ? cfg.lock() : cfg.vesting();
  const data = await api<{ position: PositionView }>(`/api/positions/${TESTNET.id}/${manager.toLowerCase()}/${id}`).catch(() => {
    throw new CliError(`No ${kind} #${id} exists.`, "List yours with:  damkeeper positions");
  });
  return data.position;
}

export async function withdrawCmd(id: string, o: { yes?: boolean }) {
  const acct = account();
  await assertNetwork();
  const p = await fetchOwn("lock", id);
  if (p.beneficiary !== acct.address.toLowerCase()) throw new CliError(`Only ${short(p.beneficiary)} can withdraw this lock.`, `You are ${short(acct.address)}.`);
  const amount = claimableOf(p);
  if (p.withdrawn) throw new CliError("Already withdrawn.");
  if (amount === 0n) throw new CliError(`Not withdrawable yet — it unlocks ${formatLocal(new Date(Number(p.unlockTime) * 1000))}.`);
  console.log(`\n  Withdraw ${c.lime(`${formatAmount(p)} ${tokenLabel(p)}`)} from lock #${id}\n`);
  await confirm("Send the withdrawal?", Boolean(o.yes));
  const receipt = await send("Withdrawing", () => walletClient().writeContract({ address: cfg.lock(), abi: lockManagerAbi, functionName: "withdraw", args: [BigInt(id)] }));
  out({ txHash: receipt.transactionHash }, () => console.log(`\n  ${c.lime("✓")} Withdrawn  ${c.dim(short(receipt.transactionHash))}\n`));
}

export async function claimCmd(id: string, o: { yes?: boolean }) {
  const acct = account();
  await assertNetwork();
  const p = await fetchOwn("vesting", id);
  if (p.beneficiary !== acct.address.toLowerCase()) throw new CliError(`Only ${short(p.beneficiary)} can claim this schedule.`, `You are ${short(acct.address)}.`);
  const amount = claimableOf(p);
  if (amount === 0n) throw new CliError("Nothing is claimable right now.", "Check the schedule with:  damkeeper show vesting " + id);
  console.log(`\n  Claim ${c.lime(`${formatAmount(p, amount)} ${tokenLabel(p)}`)} from vesting #${id}\n`);
  await confirm("Send the claim?", Boolean(o.yes));
  const receipt = await send("Claiming", () => walletClient().writeContract({ address: cfg.vesting(), abi: vestingManagerAbi, functionName: "claim", args: [BigInt(id)] }));
  out({ txHash: receipt.transactionHash }, () => console.log(`\n  ${c.lime("✓")} Claimed  ${c.dim(short(receipt.transactionHash))}\n`));
}
