import { api } from "./api";
import { account, cfg, DEFAULT_DEPLOYMENTS, publicClient, MAINNET, TESTNET, activeChain } from "./config";
import { c, kv, out, short, CliError, ok, table } from "./ui";
import { formatEther, erc20Abi } from "viem";
import { formatAmount, releaseAt, tokenLabel, type PositionView } from "./shared/position-view";
import { cardDate } from "./caption";
import { positionsCmd, statusCmd } from "./read";
import { clearSession, loadSession, loginWithBrowser } from "./session";

export async function loginCmd() {
  const envKey = process.env.DAMKEEPER_PRIVATE_KEY;
  const session = loadSession();

  if (!envKey && !session) {
    await loginWithBrowser();
  }

  const acct = account();
  const pc = publicClient();
  const activeSession = loadSession();
  const [chainId, eth] = await Promise.all([pc.getChainId(), pc.getBalance({ address: acct.address })]);

  out({ address: acct.address, authorizedBy: activeSession?.authorizedBy ?? null, chainId, eth: formatEther(eth) }, () => {
    console.log("");
    const rows: [string, string][] = [
      ["CLI Signer", c.lime(acct.address)],
    ];
    if (activeSession?.authorizedBy) {
      rows.push(["Authorized By", `${c.bold(activeSession.authorizedBy)} ${c.dim("(Phantom / Web3 Wallet)")}`]);
    }
    rows.push(
      ["Network", chainId === MAINNET.id ? `Robinhood Chain Mainnet ${c.dim("(4663)")}` : chainId === TESTNET.id ? `Robinhood Chain Testnet ${c.dim("(46630)")}` : c.red(`chain ${chainId} — unsupported`)],
      ["ETH (gas)", `${Number(formatEther(eth)).toFixed(4)}${eth === 0n ? c.yellow("  — empty. Fund wallet with ETH for gas.") : ""}`]
    );
    kv(rows);
    console.log(c.dim("\n  Ready! Next:  damkeeper positions   ·   damkeeper lock create\n"));
  });
}

export async function logoutCmd() {
  const cleared = clearSession();
  if (cleared) {
    console.log(`\n  ${ok("✓")} Logged out. Active session removed from ~/.damkeeper/session.json\n`);
  } else {
    console.log(c.dim("\n  No active session found.\n"));
  }
}

export async function faucetCmd(address?: string) {
  const to = address ?? account().address;
  const res = await api<{ txHash: string; amount: string }>("/api/faucet", { method: "POST", body: JSON.stringify({ address: to }) });
  out(res, () => console.log(`\n  ${c.lime("✓")} Sent ${res.amount} EXMPL to ${short(to)}  ${c.dim(`tx ${short(res.txHash)}`)}\n`));
}

export async function balanceCmd(o: { wallet?: string }) {
  const session = loadSession();
  const target = (o.wallet ?? session?.authorizedBy ?? account().address) as `0x${string}`;
  const signer = account().address;
  const pc = publicClient();
  const chain = activeChain();
  const tokensRes = await api<{ tokens: { address: string; symbol: string | null; decimals: number | null }[] }>(`/api/tokens?chainId=${chain.id}`).catch(() => ({ tokens: [] }));
  
  const [eth, ...tokenBalances] = await Promise.all([
    pc.getBalance({ address: target }),
    ...tokensRes.tokens.map(async (t) => {
      try {
        const bal = await pc.readContract({
          address: t.address as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [target],
        });
        return { ...t, balance: bal };
      } catch {
        return { ...t, balance: 0n };
      }
    }),
  ]);

  const rows: string[][] = [
    ["ETH", "Native (gas)", `${Number(formatEther(eth)).toFixed(4)} ETH`],
    ...tokenBalances.map((t) => [
      t.symbol ?? "CUSTOM",
      short(t.address),
      `${(Number(t.balance) / 10 ** (t.decimals ?? 18)).toLocaleString()} ${t.symbol ?? ""}`,
    ]),
  ];

  out({ address: target, eth: formatEther(eth), tokens: tokenBalances }, () => {
    console.log(`\n  ${c.bold("Balances")} ${c.dim(`for ${c.lime(target)} · ${chain.name}`)}`);
    if (session?.authorizedBy && target.toLowerCase() === session.authorizedBy.toLowerCase()) {
      console.log(`  ${c.dim(`Authorized via Phantom · CLI Signer Key: ${short(signer)}`)}\n`);
    } else {
      console.log("");
    }
    table(["ASSET", "CONTRACT", "BALANCE"], rows);
    console.log("");
  });
}

export async function homeCmd() {
  await statusCmd();
  const session = loadSession();
  const target = session?.authorizedBy ?? (process.env.DAMKEEPER_PRIVATE_KEY ? account().address : undefined);
  if (target) await positionsCmd({ wallet: target });
  else console.log(c.dim("  Connect via `damkeeper login` (or run `damkeeper positions --wallet 0x…`) to see positions.\n"));
}

export async function shareCmd(kind: string, id?: string) {
  const chain = activeChain();
  if (kind === "staking") {
    const poolAddr = id || "0x7a63503D0c99A77F9e599b7D63C6fAee7A79a28e";
    const url = `${cfg.web}/staking?pool=${poolAddr}`;
    const caption = `Stake $DAM to earn continuous yield (28.4% APR) on Damkeeper. Non-custodial, verified O(1) math on Robinhood Chain:`;
    out({ caption, url }, () => {
      console.log(`\n  ${c.dim("CAPTION")}\n  ${caption}\n\n  ${c.dim("LINK")}\n  ${url}\n`);
      console.log(c.dim("  The high-res share image is generated in the web app: open the link and use Share → Download image.\n"));
    });
    return;
  }
  if (kind !== "lock" && kind !== "vesting") throw new CliError(`Unknown kind "${kind}".`, "Use lock, vesting, or staking.");
  if (!id) throw new CliError("Position ID required for lock or vesting.");
  const deployments = await api<{ deployments: { kind: string; managerAddress: string }[] }>(`/api/deployments?chainId=${chain.id}`)
    .catch(() => ({ deployments: DEFAULT_DEPLOYMENTS }));
  const dep = deployments.deployments.find((d) => d.kind === kind);
  if (!dep) throw new CliError(`No ${kind} contract is recorded for this network.`);
  const p = (await api<{ position: PositionView }>(`/api/positions/${chain.id}/${dep.managerAddress}/${id}`).catch(() => {
    throw new CliError(`No ${kind} #${id} exists.`);
  })).position;
  const url = `${cfg.web}/positions/${chain.id}/${p.manager}/${p.positionId}`;
  const amount = `${formatAmount(p, p.amount, 2)} ${tokenLabel(p)}`;
  const end = releaseAt(p);
  const caption =
    p.kind === "lock"
      ? `${amount} is locked on Damkeeper until ${end ? cardDate(end) : "its unlock date"}. The terms are fixed onchain — check them yourself:`
      : `${amount} vests on Damkeeper until ${end ? cardDate(end) : "its end date"}. Check the schedule onchain:`;
  out({ caption, url }, () => {
    console.log(`\n  ${c.dim("CAPTION")}\n  ${caption}\n\n  ${c.dim("LINK")}\n  ${url}\n`);
    console.log(c.dim("  The share image is generated in the web app: open the link and use Share → Download image.\n"));
  });
}
