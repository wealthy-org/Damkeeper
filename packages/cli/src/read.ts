import { api } from "./api";
import { cfg } from "./config";
import { c, isJson, kv, out, short, table, CliError } from "./ui";
import { formatShort } from "@/lib/dates";
import {
  formatAmount, proofPath, releaseAt, shortAddress, statusOf, STATUS_LABEL, tokenLabel, claimableOf, type PositionView,
} from "@/lib/position-view";
import { formatLocal, formatUtc } from "@/lib/dates";
import { pending } from "./recent";

const CHAIN = 46630;
type Kind = "lock" | "vesting";
const asKind = (s: string): Kind => {
  if (s === "lock" || s === "vesting") return s;
  throw new CliError(`Unknown kind "${s}".`, "Use lock or vesting.");
};
const statusColor = (p: PositionView) => {
  const s = statusOf(p);
  const label = STATUS_LABEL[s];
  return s === "withdrawn" || s === "fully_claimed" ? c.dim(label) : s === "withdrawable" || s === "fully_vested" ? c.lime(label) : label;
};

export function positionRows(list: PositionView[], me?: string) {
  table(
    ["#", "KIND", "AMOUNT", "RELEASES", "STATUS", me ? "ROLE" : "BENEFICIARY", "LABEL"],
    list.map((p) => [
      p.positionId,
      p.kind,
      `${formatAmount(p)} ${tokenLabel(p)}`,
      releaseAt(p) ? formatShort(releaseAt(p)!) : "—",
      statusColor(p),
      me ? (p.beneficiary === me && p.creator === me ? "yours" : p.beneficiary === me ? "incoming" : "outgoing") : shortAddress(p.beneficiary),
      p.label ?? c.dim("—"),
    ])
  );
}

export async function positionsCmd(o: { wallet: string; type?: string; incoming?: boolean; outgoing?: boolean }) {
  const qs = new URLSearchParams({ chainId: String(CHAIN), wallet: o.wallet });
  if (o.type) qs.set("type", asKind(o.type));
  if (o.incoming && !o.outgoing) qs.set("role", "beneficiary");
  if (o.outgoing && !o.incoming) qs.set("role", "creator");
  const data = await api<{ positions: PositionView[] }>(`/api/positions?${qs}`);
  out(data.positions, () => {
    console.log(`\n  ${c.bold("Positions")} ${c.dim(`for ${short(o.wallet)} · ${data.positions.length}`)}\n`);
    if (!data.positions.length) return console.log(c.dim("  Nothing yet. Create one with:  damkeeper lock create\n"));
    positionRows(data.positions, o.wallet.toLowerCase());
    console.log("");
  });
  const waiting = isJson() ? [] : pending(data.positions);
  if (waiting.length)
    console.log(`  ${c.yellow("⏳")} Just created, not indexed yet: ${waiting.map((w) => `${w.kind} #${w.id}`).join(", ")}\n     ${c.dim("They're on-chain already. See one now with:  damkeeper show " + waiting[0].kind + " " + waiting[0].id)}\n`);
}

export async function showCmd(kind: string, id: string) {
  const deployments = await api<{ deployments: { kind: string; managerAddress: string }[] }>(`/api/deployments?chainId=${CHAIN}`);
  const dep = deployments.deployments.find((d) => d.kind === asKind(kind));
  if (!dep) throw new CliError(`No ${kind} contract is recorded for this network.`);
  if (!/^\d+$/.test(id)) throw new CliError(`"${id}" isn't a position number.`);
  const data = await api<{ position: PositionView; events: { eventName: string; blockNumber: string; txHash: string }[] }>(
    `/api/positions/${CHAIN}/${dep.managerAddress}/${id}`
  ).catch((e) => {
    if (e instanceof CliError && /not found/i.test(e.message)) throw new CliError(`No ${kind} #${id} exists.`, "List yours with:  damkeeper positions --wallet 0x…");
    throw e;
  });
  const p = data.position;
  out(data, () => {
    const at = (s: string | null) => (s && s !== "0" ? new Date(Number(s) * 1000) : null);
    const when = (d: Date | null) => (d ? `${formatLocal(d)}  ${c.dim(formatUtc(d))}` : "—");
    console.log(`\n  ${c.bold(`${p.kind === "lock" ? "Lock" : "Vesting"} #${p.positionId}`)}  ${p.label ? c.lime(p.label) : ""}  ${statusColor(p)}\n`);
    kv([
      ["Token", `${tokenLabel(p)}${p.tokenName ? ` · ${p.tokenName}` : ""}  ${c.dim(p.token)}`],
      ["Deposited", `${formatAmount(p)} ${tokenLabel(p)}`],
      ...(p.kind === "vesting"
        ? ([
            ["Claimed", `${formatAmount(p, p.claimedAmount)} ${tokenLabel(p)}`],
            ["Claimable now", c.lime(`${formatAmount(p, claimableOf(p))} ${tokenLabel(p)}`)],
            ["Start", when(at(p.startTime))],
            ["Cliff", at(p.cliffTime) ? when(at(p.cliffTime)) : "None"],
            ["End", when(at(p.endTime))],
          ] as [string, string][])
        : ([["Unlocks", when(at(p.unlockTime))]] as [string, string][])),
      ["Creator", p.creator],
      ["Beneficiary", p.beneficiary],
      ["Contract", p.manager],
    ]);
    if (data.events.length) {
      console.log(`\n  ${c.dim("HISTORY")}`);
      for (const e of data.events) console.log(`    ${e.eventName.padEnd(15)} block ${e.blockNumber}  ${c.dim(`tx ${short(e.txHash)}`)}`);
    }
    console.log(`\n  ${c.dim("Proof")}  ${cfg.web}${proofPath(p)}\n`);
  });
}

export async function exploreCmd(o: { type?: string; q?: string }) {
  const qs = new URLSearchParams({ chainId: String(CHAIN) });
  if (o.type) qs.set("type", asKind(o.type));
  if (o.q) qs.set("q", o.q);
  const data = await api<{ positions: PositionView[] }>(`/api/positions?${qs}`);
  out(data.positions, () => {
    console.log(`\n  ${c.bold("Explore")} ${c.dim(`${data.positions.length} result${data.positions.length === 1 ? "" : "s"}`)}\n`);
    if (!data.positions.length) return console.log(c.dim("  No positions match. Try a full token or wallet address.\n"));
    positionRows(data.positions);
    console.log("");
  });
}

export async function tokensCmd(o: { q?: string }) {
  const data = await api<{ tokens: { address: string; symbol: string | null; name: string | null; decimals: number | null; policy: { enabled: boolean; liabilityCap: string } | null }[] }>(
    `/api/tokens?chainId=${CHAIN}`
  );
  const q = o.q?.toLowerCase();
  const list = data.tokens.filter((t) => !q || [t.address, t.symbol, t.name].some((v) => v?.toLowerCase().includes(q)));
  out(list, () => {
    console.log(`\n  ${c.bold("Tokens")} ${c.dim(`${list.length}`)}\n`);
    table(["SYMBOL", "NAME", "ADDRESS", "DECIMALS"], list.map((t) => [t.symbol ?? "?", t.name ?? "—", t.address, String(t.decimals ?? "?")]));
    console.log(c.dim("\n  Amounts are in each token's own units. There's no price feed, so no dollar values.\n"));
  });
}

export async function contractsCmd() {
  const data = await api<{ deployments: { kind: string; managerAddress: string; version: string; verifiedSourceUrl: string | null; admin: string; deployBlock: string }[] }>(
    `/api/deployments?chainId=${CHAIN}`
  );
  out(data.deployments, () => {
    console.log(`\n  ${c.bold("Contracts")} ${c.dim("Robinhood Chain Testnet · 46630")}\n`);
    for (const d of data.deployments) {
      console.log(`  ${c.lime(d.kind === "lock" ? "LockManager" : "VestingManager")} ${c.dim(`v${d.version}`)}`);
      kv([
        ["Address", d.managerAddress],
        ["Source", d.verifiedSourceUrl ? c.green("verified") + c.dim(`  ${d.verifiedSourceUrl}`) : c.yellow("not verified yet")],
        ["Admin", `${d.admin}  ${c.dim("(single wallet — testnet only)")}`],
        ["Deployed", `block ${d.deployBlock}`],
      ], 4);
      console.log("");
    }
  });
}

export async function statusCmd() {
  const [health, stats] = await Promise.all([
    api<{ status: string; indexer: { manager: string; lastBlock: string; confirmationTier: string; updatedAt: string }[] }>("/api/health"),
    api<Record<string, number | string | null>>("/api/stats").catch(() => null),
  ]);
  out({ health, stats }, () => {
    console.log(`\n  ${c.bold("Status")}  ${health.status === "ok" ? c.green("● app healthy") : c.red("● degraded")}\n`);
    for (const i of health.indexer) {
      const ageMin = Math.round((Date.now() - new Date(i.updatedAt).getTime()) / 60000);
      console.log(`  Indexer ${short(i.manager)}  block ${i.lastBlock}  ${c.dim(`${i.confirmationTier} · updated ${ageMin} min ago`)}`);
      if (ageMin > 30) console.log(`    ${c.yellow("⚠ data may be stale — positions created recently might not show yet")}`);
    }
    if (stats) {
      console.log("");
      kv([
        ["Active locks", String(stats.activeLocks)],
        ["Active vesting", String(stats.activeVesting)],
        ["Settled", String(stats.settled)],
        ["Tokens", String(stats.tokens)],
      ]);
    }
    console.log("");
  });
}
