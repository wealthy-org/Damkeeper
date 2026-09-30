import { api } from "./api";
import { account, cfg, publicClient, TESTNET } from "./config";
import { c, kv, out, short, CliError, ok, table } from "./ui";
import { formatEther, erc20Abi } from "viem";
import { formatAmount, releaseAt, tokenLabel, type PositionView } from "@/lib/position-view";
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
      ["Network", chainId === TESTNET.id ? `Robinhood Chain Testnet ${c.dim("(46630)")}` : c.red(`chain ${chainId} — not Robinhood Chain Testnet`)],
      ["ETH (gas)", `${Number(formatEther(eth)).toFixed(4)}${eth === 0n ? c.yellow("  — empty. Get testnet ETH from the faucet in the README.") : ""}`]
    );
    kv(rows);
    console.log(c.dim("\n  Ready! Next:  damkeeper faucet   ·   damkeeper lock create\n"));
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
  const target = (o.wallet ?? account().address) as `0x${string}`;
  const pc = publicClient();
  const tokensRes = await api<{ tokens: { address: string; symbol: string | null; decimals: number | null }[] }>(`/api/tokens?chainId=${TESTNET.id}`).catch(() => ({ tokens: [] }));
  
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
    console.log(`\n  ${c.bold("Balances")} ${c.dim(`for ${short(target)} · Robinhood Chain Testnet`)}\n`);
    table(["ASSET", "CONTRACT", "BALANCE"], rows);
    console.log("");
  });
}

export async function homeCmd() {
  await statusCmd();
  const key = process.env.DAMKEEPER_PRIVATE_KEY;
  if (key) await positionsCmd({ wallet: account().address });
  else console.log(c.dim("  Set DAMKEEPER_PRIVATE_KEY (or run `damkeeper positions --wallet 0x…`) to see positions.\n"));
}

export async function shareCmd(kind: string, id: string) {
  if (kind !== "lock" && kind !== "vesting") throw new CliError(`Unknown kind "${kind}".`, "Use lock or vesting.");
  const dep = (await api<{ deployments: { kind: string; managerAddress: string }[] }>(`/api/deployments?chainId=${TESTNET.id}`)).deployments.find((d) => d.kind === kind);
  if (!dep) throw new CliError(`No ${kind} contract is recorded for this network.`);
  const p = (await api<{ position: PositionView }>(`/api/positions/${TESTNET.id}/${dep.managerAddress}/${id}`).catch(() => {
    throw new CliError(`No ${kind} #${id} exists.`);
  })).position;
  const url = `${cfg.web}/positions/${TESTNET.id}/${p.manager}/${p.positionId}`;
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
