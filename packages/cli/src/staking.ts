import { isAddress, parseAbi, type TransactionReceipt, formatUnits } from "viem";
import { api } from "./api";
import { account, activeChain, publicClient, walletClient } from "./config";
import { ask, confirm, interactive } from "./prompt";
import { c, CliError, kv, ok, out, short, step } from "./ui";
import { formatTokenAmount, safeParseUnits } from "./shared/amounts";
import { stakingPoolAbi, stakingFactoryAbi } from "./shared/abi";

export const DEFAULT_DAM_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4" as const;
export const DEFAULT_OFFICIAL_POOL = (
  process.env.NEXT_PUBLIC_DAM_STAKING_POOL_ADDRESS ?? "0x7a63503D0c99A77F9e599b7D63C6fAee7A79a28e"
) as `0x${string}`;
export const DEFAULT_FACTORY = (
  process.env.NEXT_PUBLIC_STAKING_FACTORY_ADDRESS ?? "0x89C54e867bF140e6AcEFA39fF78553531F0a498D"
) as `0x${string}`;

const erc20Abi = parseAbi([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

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
  if (receipt.status === "reverted") throw new CliError(`Reverted onchain (${short(hash)}) — transaction failed.`);
  step(label, `${ok("SUCCESS")} ${c.dim(`block ${receipt.blockNumber}`)}`);
  return receipt;
}

export async function stakingListCmd() {
  const chain = activeChain();
  let pools: any[] = [];
  try {
    const res = await api<{ ok: boolean; pools: any[] }>(`/api/staking/pools?chainId=${chain.id}`);
    if (res?.pools) pools = res.pools;
  } catch {
    // offline fallback
  }

  if (pools.length === 0) {
    pools = [
      {
        poolAddress: DEFAULT_OFFICIAL_POOL,
        name: "Official $DAM Staking Pool",
        stakingSymbol: "DAM",
        rewardSymbol: "DAM",
        lockDuration: "0",
        totalStaked: "250000000000000000000000",
        stakingDecimals: 18,
        apr: 28.4,
        isOfficial: true,
      },
    ];
  }

  out({ pools }, () => {
    console.log(`\n  ${c.bold("ACTIVE STAKING POOLS")}  ${c.dim(`(${chain.name})`)}\n`);
    for (const p of pools) {
      const lockPolicy =
        p.lockDuration === "0"
          ? c.lime("Flexible")
          : c.yellow(`${Math.round(Number(p.lockDuration) / 86400)}d Lock`);

      const totalStakedFmt = formatTokenAmount(BigInt(p.totalStaked || "0"), p.stakingDecimals || 18);
      const tag = p.isOfficial ? c.lime("[Official $DAM]") : c.dim("[Community]");

      console.log(`  ${tag} ${c.bold(p.name)}`);
      console.log(`    Pool:   ${c.cyan(p.poolAddress)}`);
      console.log(`    Pair:   ${p.stakingSymbol} → ${p.rewardSymbol}`);
      console.log(`    Policy: ${lockPolicy} · APR: ${c.lime(`${p.apr || 28.4}%`)}`);
      console.log(`    Staked: ${totalStakedFmt} ${p.stakingSymbol}\n`);
    }
  });
}

export async function stakingPoolCmd(poolAddressArg?: string) {
  let poolAddr = poolAddressArg;
  if (!poolAddr) {
    poolAddr = interactive()
      ? await ask("Pool contract address (Enter = Official $DAM)", DEFAULT_OFFICIAL_POOL)
      : DEFAULT_OFFICIAL_POOL;
  }
  poolAddr = poolAddr.trim();
  if (!isAddress(poolAddr)) throw new CliError(`Invalid pool address: ${poolAddr}`);

  const pc = publicClient();
  const acct = account();
  const p = poolAddr as `0x${string}`;

  step("Pool", "reading onchain state…");
  const [sToken, rToken, totalStaked, rRate, pFinish, lockSec, pName] = await Promise.all([
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "stakingToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "rewardToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "totalStaked" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "rewardRate" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "periodFinish" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "lockDuration" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "poolName" }),
  ]);

  const [sSym, sDec, rSym, rDec] = await Promise.all([
    pc.readContract({ address: sToken, abi: erc20Abi, functionName: "symbol" }).catch(() => "STK"),
    pc.readContract({ address: sToken, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    pc.readContract({ address: rToken, abi: erc20Abi, functionName: "symbol" }).catch(() => "RWD"),
    pc.readContract({ address: rToken, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
  ]);

  let userStaked = 0n;
  let userEarned = 0n;
  if (acct.address) {
    [userStaked, userEarned] = await Promise.all([
      pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "balanceOf", args: [acct.address] }).catch(() => 0n),
      pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "earned", args: [acct.address] }).catch(() => 0n),
    ]);
  }

  out(
    {
      pool: poolAddr,
      name: pName,
      stakingToken: sToken,
      rewardToken: rToken,
      totalStaked: totalStaked.toString(),
      lockDuration: lockSec.toString(),
      userStaked: userStaked.toString(),
      userEarned: userEarned.toString(),
    },
    () => {
      console.log(`\n  ${c.bold(pName || "Staking Pool")}  ${c.dim(`(${poolAddr})`)}\n`);
      kv([
        ["Pool Address", poolAddr],
        ["Staking Token", `${sSym} (${short(sToken)})`],
        ["Reward Token", `${rSym} (${short(rToken)})`],
        ["Total Staked", `${formatTokenAmount(totalStaked, sDec)} ${sSym}`],
        ["Lock Duration", lockSec === 0n ? "Flexible (unstake anytime)" : `${lockSec} seconds`],
        ["Your Staked", `${formatTokenAmount(userStaked, sDec)} ${sSym}`],
        ["Your Earned", `${formatTokenAmount(userEarned, rDec)} ${rSym}`],
      ]);
      console.log("");
    }
  );
}

export async function stakingStakeCmd(poolAddressArg?: string, o: { amount?: string; yes?: boolean } = {}) {
  let poolAddr = poolAddressArg;
  if (!poolAddr) {
    poolAddr = interactive()
      ? await ask("Pool contract address (Enter = Official $DAM)", DEFAULT_OFFICIAL_POOL)
      : DEFAULT_OFFICIAL_POOL;
  }
  poolAddr = poolAddr.trim();
  if (!isAddress(poolAddr)) throw new CliError(`Invalid pool address: ${poolAddr}`);

  const pc = publicClient();
  const wc = walletClient();
  const acct = account();
  const p = poolAddr as `0x${string}`;

  const [sToken, lockSec, pName] = await Promise.all([
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "stakingToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "lockDuration" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "poolName" }),
  ]);

  const [sSym, sDec, userBal, userAllow] = await Promise.all([
    pc.readContract({ address: sToken, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    pc.readContract({ address: sToken, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    pc.readContract({ address: sToken, abi: erc20Abi, functionName: "balanceOf", args: [acct.address] }),
    pc.readContract({ address: sToken, abi: erc20Abi, functionName: "allowance", args: [acct.address, p] }),
  ]);

  if (userBal <= 0n) {
    throw new CliError(`You have 0 ${sSym} in your wallet (${short(acct.address)}).`);
  }

  let amtStr = o.amount;
  if (!amtStr) {
    if (!interactive()) throw new CliError("Amount required. Pass --amount <n>.");
    amtStr = await ask(`Amount to stake (Balance: ${formatTokenAmount(userBal, sDec)} ${sSym})`);
  }

  let amountRaw: bigint;
  if (amtStr.trim().toLowerCase() === "max") {
    amountRaw = userBal;
  } else {
    const parsed = safeParseUnits(amtStr.trim(), sDec);
    if (!parsed || parsed <= 0n) throw new CliError("Invalid amount.");
    amountRaw = parsed;
  }

  if (amountRaw > userBal) {
    throw new CliError(`Insufficient balance. You have ${formatTokenAmount(userBal, sDec)} ${sSym}.`);
  }

  if (!o.yes) {
    kv([
      ["Pool", pName],
      ["Address", poolAddr],
      ["Amount", `${formatTokenAmount(amountRaw, sDec)} ${sSym}`],
      ["Lock Policy", lockSec === 0n ? "Flexible (unstake anytime)" : `${Number(lockSec) / 86400} days`],
    ]);
    const okToProceed = await confirm("\nConfirm stake?", true);
    if (!okToProceed) throw new CliError("Cancelled.");
  }

  // 1. Approve if needed
  if (userAllow < amountRaw) {
    await send(`Approve ${sSym}`, () =>
      wc.writeContract({
        address: sToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [p, 2n ** 256n - 1n],
        account: acct,
        chain: activeChain(),
      })
    );
  }

  // 2. Stake
  const receipt = await send(`Stake ${formatTokenAmount(amountRaw, sDec)} ${sSym}`, () =>
    wc.writeContract({
      address: p,
      abi: stakingPoolAbi,
      functionName: "stake",
      args: [amountRaw],
      account: acct,
      chain: activeChain(),
    })
  );

  console.log(`\n  ${ok("Staked successfully!")} Tx: ${c.cyan(receipt.transactionHash)}\n`);
}

export async function stakingUnstakeCmd(
  poolAddressArg?: string,
  o: { amount?: string; yes?: boolean; emergency?: boolean } = {}
) {
  let poolAddr = poolAddressArg;
  if (!poolAddr) {
    poolAddr = interactive()
      ? await ask("Pool contract address (Enter = Official $DAM)", DEFAULT_OFFICIAL_POOL)
      : DEFAULT_OFFICIAL_POOL;
  }
  poolAddr = poolAddr.trim();
  if (!isAddress(poolAddr)) throw new CliError(`Invalid pool address: ${poolAddr}`);

  const pc = publicClient();
  const wc = walletClient();
  const acct = account();
  const p = poolAddr as `0x${string}`;

  const [sToken, userStaked, sTime, lockSec] = await Promise.all([
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "stakingToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "balanceOf", args: [acct.address] }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "stakeTimestamp", args: [acct.address] }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "lockDuration" }),
  ]);

  const [sSym, sDec] = await Promise.all([
    pc.readContract({ address: sToken, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    pc.readContract({ address: sToken, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
  ]);

  if (userStaked <= 0n) {
    throw new CliError(`You have 0 staked tokens in this pool.`);
  }

  if (o.emergency) {
    if (!o.yes) {
      const okEmergency = await confirm(
        "Emergency withdraw will retrieve your principal immediately WITHOUT calculating rewards. Continue?",
        false
      );
      if (!okEmergency) throw new CliError("Cancelled.");
    }

    const receipt = await send("Emergency withdraw", () =>
      wc.writeContract({
        address: p,
        abi: stakingPoolAbi,
        functionName: "emergencyWithdraw",
        args: [],
        account: acct,
        chain: activeChain(),
      })
    );
    console.log(`\n  ${ok("Emergency withdrawn successfully!")} Tx: ${c.cyan(receipt.transactionHash)}\n`);
    return;
  }

  // Check timelock
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const unlockTime = sTime + lockSec;
  if (lockSec > 0n && nowSec < unlockTime) {
    const rem = Number(unlockTime - nowSec);
    throw new CliError(
      `Pool is locked. Unlock time is in ${Math.ceil(rem / 60)} minutes. Use --emergency if you must exit now.`
    );
  }

  let amtStr = o.amount;
  if (!amtStr) {
    if (!interactive()) throw new CliError("Amount required. Pass --amount <n>.");
    amtStr = await ask(`Amount to unstake (Staked: ${formatTokenAmount(userStaked, sDec)} ${sSym})`, "max");
  }

  let amountRaw: bigint;
  if (amtStr.trim().toLowerCase() === "max") {
    amountRaw = userStaked;
  } else {
    const parsed = safeParseUnits(amtStr.trim(), sDec);
    if (!parsed || parsed <= 0n) throw new CliError("Invalid amount.");
    amountRaw = parsed;
  }

  if (amountRaw > userStaked) {
    throw new CliError(`Insufficient staked balance. You have ${formatTokenAmount(userStaked, sDec)} ${sSym}.`);
  }

  const receipt = await send(`Unstake ${formatTokenAmount(amountRaw, sDec)} ${sSym}`, () =>
    wc.writeContract({
      address: p,
      abi: stakingPoolAbi,
      functionName: "withdraw",
      args: [amountRaw],
      account: acct,
      chain: activeChain(),
    })
  );

  console.log(`\n  ${ok("Unstaked successfully!")} Tx: ${c.cyan(receipt.transactionHash)}\n`);
}

export async function stakingClaimCmd(poolAddressArg?: string, o: { yes?: boolean } = {}) {
  let poolAddr = poolAddressArg;
  if (!poolAddr) {
    poolAddr = interactive()
      ? await ask("Pool contract address (Enter = Official $DAM)", DEFAULT_OFFICIAL_POOL)
      : DEFAULT_OFFICIAL_POOL;
  }
  poolAddr = poolAddr.trim();
  if (!isAddress(poolAddr)) throw new CliError(`Invalid pool address: ${poolAddr}`);

  const pc = publicClient();
  const wc = walletClient();
  const acct = account();
  const p = poolAddr as `0x${string}`;

  const [rToken, userEarned] = await Promise.all([
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "rewardToken" }),
    pc.readContract({ address: p, abi: stakingPoolAbi, functionName: "earned", args: [acct.address] }),
  ]);

  const [rSym, rDec] = await Promise.all([
    pc.readContract({ address: rToken, abi: erc20Abi, functionName: "symbol" }).catch(() => "REWARD"),
    pc.readContract({ address: rToken, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
  ]);

  if (userEarned <= 0n) {
    console.log(`  No rewards earned yet for this wallet in pool ${short(p)}.`);
    return;
  }

  const receipt = await send(`Harvest ${formatTokenAmount(userEarned, rDec)} ${rSym}`, () =>
    wc.writeContract({
      address: p,
      abi: stakingPoolAbi,
      functionName: "getReward",
      args: [],
      account: acct,
      chain: activeChain(),
    })
  );

  console.log(`\n  ${ok("Rewards harvested successfully!")} Tx: ${c.cyan(receipt.transactionHash)}\n`);
}

export async function stakingCreateCmd(
  o: { stakingToken?: string; rewardToken?: string; lockDays?: number; name?: string; yes?: boolean } = {}
) {
  const acct = account();
  const pc = publicClient();
  const wc = walletClient();

  let sToken = o.stakingToken;
  if (!sToken) {
    sToken = interactive()
      ? await ask("Staking token address (Enter = $DAM)", DEFAULT_DAM_TOKEN)
      : DEFAULT_DAM_TOKEN;
  }
  sToken = sToken.trim();
  if (!isAddress(sToken)) throw new CliError(`Invalid staking token: ${sToken}`);

  let rToken = o.rewardToken;
  if (!rToken) {
    rToken = interactive()
      ? await ask("Reward token address (Enter = $DAM)", DEFAULT_DAM_TOKEN)
      : DEFAULT_DAM_TOKEN;
  }
  rToken = rToken.trim();
  if (!isAddress(rToken)) throw new CliError(`Invalid reward token: ${rToken}`);

  let name = o.name;
  if (!name) {
    name = interactive()
      ? await ask("Pool name", "Community Yield Pool")
      : "Community Yield Pool";
  }

  let lockDays = o.lockDays ?? 0;
  if (interactive() && o.lockDays === undefined) {
    const lockAns = await ask("Lock duration in days (0 for flexible unstaking)", "0");
    lockDays = parseInt(lockAns, 10) || 0;
  }
  const lockDurationSec = BigInt(lockDays * 86400);

  if (!o.yes) {
    kv([
      ["Pool Name", name],
      ["Staking Token", sToken],
      ["Reward Token", rToken],
      ["Lock Policy", lockDays === 0 ? "Flexible (unstake anytime)" : `${lockDays} days lock`],
    ]);
    const okDeploy = await confirm("\nDeploy new staking pool via factory?", true);
    if (!okDeploy) throw new CliError("Cancelled.");
  }

  const receipt = await send(`Deploy pool via Factory`, () =>
    wc.writeContract({
      address: DEFAULT_FACTORY,
      abi: stakingFactoryAbi,
      functionName: "createPool",
      args: [sToken as `0x${string}`, rToken as `0x${string}`, lockDurationSec, name],
      account: acct,
      chain: activeChain(),
    })
  );

  let poolAddr: string | null = null;
  if (receipt.logs && receipt.logs.length > 0 && receipt.logs[0].topics[1]) {
    poolAddr = `0x${receipt.logs[0].topics[1].slice(26)}`.toLowerCase();
  }

  console.log(`\n  ${ok("Staking pool deployed!")}`);
  if (poolAddr) console.log(`  Pool Address: ${c.lime(poolAddr)}`);
  console.log(`  Tx Hash:      ${c.cyan(receipt.transactionHash)}\n`);
}
