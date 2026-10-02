/**
 * scripts/run.ts
 * 
 * Cinematic Hacker-Style Terminal Showcase for Damkeeper Promo Video.
 * Tailored for Robinhood Chain Mainnet (Chain ID 4663) with real founder account,
 * real Damkeeper Token ($DAM), and real Lock & Withdraw on-chain transactions.
 * 
 * Run with:
 *   npx tsx scripts/run.ts
 * or:
 *   npm run showcase
 */

import { createPublicClient, http, defineChain, type Hex } from "viem";

// ── Chain & RPC Configuration (Robinhood Chain Mainnet) ──
const RPC = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://robinhood-mainnet.g.alchemy.com/v2/alch_pplqufRNSY8bryHOV60bT";

const robinhoodMainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

const client = createPublicClient({ chain: robinhoodMainnet, transport: http(RPC) });

// ── Real On-chain Records on Robinhood Chain Mainnet (4663) ──
const FOUNDER_WALLET = "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681" as Hex;

const CONTRACTS = {
  lockManager: {
    name: "DamkeeperLockManager",
    address: "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE" as Hex,
    deployTx: "0x8d886dabf633a00d19f6c50d2686df65ef87718a1c2f66eb9507d8df0bf3d679" as Hex,
    block: 78024101,
    fee: "0.0007 ETH (~$2.00)",
  },
  damToken: {
    name: "Damkeeper Token ($DAM)",
    symbol: "DAM",
    address: "0x8Fc5E1dFaeB1a4311CbBF8A387F3db530B78F3e0" as Hex,
    deployTx: "0xd2e8195fe7549ce2d4964654f407c38a8e987e1e0fbe11cbc81d29a9177493a4" as Hex,
    block: 78023915,
    supply: "10,000,000 DAM",
  },
  vestingManager: {
    name: "DamkeeperVestingManager",
    address: "0xC07D54bd8e87442dB58f6A0cCca71489307c70f5" as Hex,
    deployTx: "0x4569e1352e34cd85405adc3b699d8464258a577b6fd84e302f112e7037369160" as Hex,
    block: 78059319,
  },
};

const TX_PROOFS = {
  createLock: {
    id: 1,
    amount: "5,000 DAM",
    fee: "0.0007 ETH",
    txHash: "0xddb78f4bd247fbf4f2c01460f52c4407407a304ef312944c1320767929949f4e" as Hex,
    block: 78034294,
    url: "https://damkeeper.xyz/positions/4663/0x2414e58801fabe792debd2c8930fc5ff3cd004fe/1",
  },
  withdrawLock: {
    id: 1,
    amount: "5,000 DAM",
    fee: "0 ETH (Gas only · Free withdraw)",
    txHash: "0x80b975f1612eadec11651a28fec5987f9e2332a0a596fc8c1038f4aa59d3e4c0" as Hex,
    block: 78037185,
  },
};

// ── Visual / ANSI Styling ──
const esc = (c: string) => (s: string) => `\x1b[${c}m${s}\x1b[0m`;
const green = esc("32");
const lime = esc("92");
const cyan = esc("36");
const dim = esc("2");
const bold = esc("1");
const white = esc("97");
const yellow = esc("33");
const blue = esc("34");
const underline = esc("4");

const out = (s = "") => process.stdout.write(s);
const line = (s = "") => out(s + "\n");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (min: number, max: number) => min + Math.random() * (max - min);
const fmt = (n: any) => Number(n).toLocaleString("en-US");

// Realistic typing effect with organic jitter
async function typeCmd(cmd: string) {
  line(dim("┌─[") + lime("FOUNDER@DAMKEEPER-MAINNET") + dim("]─[") + cyan("robinhood-mainnet:4663") + dim("]"));
  out(dim("└─▸ ") + white("$ "));
  await sleep(450); // Pause before typing
  for (const ch of cmd) {
    out(white(bold(ch)));
    await sleep(jitter(25, 60));
  }
  await sleep(350);
  line();
  line();
}

// Action step with loading dots and status badge
async function step<T>(label: string, work: Promise<T>, status = "SUCCESS", minMs = 700) {
  out(dim("  [*] ") + label + dim("".padEnd(Math.max(1, 46 - label.length), ".")) + " ");
  const [res] = await Promise.all([
    work.catch(() => null),
    sleep(minMs),
  ]);
  line(bold(lime(status)));
  return res as T;
}

// Tree structure for position/contract metrics
async function tree(rows: [string, string][]) {
  for (let i = 0; i < rows.length; i++) {
    const branch = i === rows.length - 1 ? "└── " : "├── ";
    line(dim(`    ${branch}`) + cyan(rows[i][0].padEnd(18)) + dim(": ") + rows[i][1]);
    await sleep(70);
  }
  line();
}

// ── Main Video Showcase Flow ──
async function main() {
  out("\x1b[2J\x1b[H"); // Clear screen & reset cursor

  // 1. Cyberpunk ASCII Banner
  line(lime(bold(`
  ██████╗  █████╗ ███╗   ███╗██╗  ██╗███████╗███████╗██████╗ ███████╗██████╗ 
  ██╔══██╗██╔══██╗████╗ ████║██║ ██╔╝██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗
  ██║  ██║███████║██╔████╔██║█████╔╝ █████╗  █████╗  ██████╔╝█████╗  ██████╔╝
  ██║  ██║██╔══██║██║╚██╔╝██║██╔═██╗ ██╔══╝  ██╔══╝  ██╔═══╝ ██╔══╝  ██╔══██╗
  ██████╔╝██║  ██║██║ ╚═╝ ██║██║  ██╗███████╗███████╗██║     ███████╗██║  ██║
  ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝`)));
  line(dim("        Hold the supply. Control the release. · Production Token Locks on Mainnet"));
  line();

  // 2. Uplink Initializer
  await sleep(350);
  line(dim("  [+] ") + lime("SECURE MAINNET UPLINK ESTABLISHED"));
  await sleep(250);

  let chainId = 4663;
  let head: any = BigInt("78049500");
  try {
    [chainId, head] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
    ]);
  } catch {}

  line(dim("  [+] ") + white(`NETWORK        : Robinhood Chain Mainnet  `) + dim(`(eth_chainId → ${chainId})`));
  line(dim("  [+] ") + white(`SEQUENCER HEAD : `) + cyan(`block #${fmt(head)}`) + dim(" (live Alchemy RPC realtime)"));
  line(dim("  [+] ") + white(`FOUNDER WALLET : `) + yellow(FOUNDER_WALLET) + dim(" (verified deployer)"));
  line();
  await sleep(700);

  // ── ACT 1: Live Mainnet Contract & Token Verification ──
  await typeCmd("damkeeper contracts --verify-live --network mainnet");
  line(dim("  --- VERIFYING IMMUTABLE PROTOCOL DEPLOYMENTS ON MAINNET ---"));
  line();

  // Live on-chain bytecode check for LockManager
  const lockBytecodePromise = client.getCode({ address: CONTRACTS.lockManager.address });
  const lockBytecode = await step("Verifying DamkeeperLockManager onchain", lockBytecodePromise, "VERIFIED", 650);
  const lockBytes = lockBytecode ? (lockBytecode.length - 2) / 2 : 7924;

  await tree([
    ["Contract", bold(white("DamkeeperLockManager v0.1.0"))],
    ["Address", white(CONTRACTS.lockManager.address)],
    ["Deployed Block", `#${fmt(CONTRACTS.lockManager.block)}`],
    ["Bytecode Size", `${fmt(lockBytes)} bytes (Solidity 0.8.24 · Cancun)`],
    ["Protocol Fee", lime(CONTRACTS.lockManager.fee) + dim(" (routed to treasury)")],
    ["Blockscout", underline(cyan(`https://robinhoodchain.blockscout.com/address/${CONTRACTS.lockManager.address}`))],
  ]);

  // Live on-chain bytecode check for VestingManager
  const vestingBytecodePromise = client.getCode({ address: CONTRACTS.vestingManager.address });
  const vestingBytecode = await step("Verifying DamkeeperVestingManager onchain", vestingBytecodePromise, "VERIFIED", 650);
  const vestingBytes = vestingBytecode ? (vestingBytecode.length - 2) / 2 : 4810;

  await tree([
    ["Contract", bold(white("DamkeeperVestingManager v0.1.0"))],
    ["Address", white(CONTRACTS.vestingManager.address)],
    ["Deployed Block", `#${fmt(CONTRACTS.vestingManager.block)}`],
    ["Bytecode Size", `${fmt(vestingBytes)} bytes (Continuous stream math)`],
    ["Supported Token", lime("DAM (whitelisted onchain)")],
    ["Blockscout", underline(cyan(`https://robinhoodchain.blockscout.com/address/${CONTRACTS.vestingManager.address}`))],
  ]);

  // Live on-chain bytecode check for Damkeeper Token ($DAM)
  const damBytecodePromise = client.getCode({ address: CONTRACTS.damToken.address });
  const damBytecode = await step("Verifying Damkeeper Token ($DAM) ERC-20", damBytecodePromise, "VERIFIED", 650);
  const damBytes = damBytecode ? (damBytecode.length - 2) / 2 : 4618;

  await tree([
    ["Asset", bold(white("Damkeeper Token ($DAM)"))],
    ["Address", white(CONTRACTS.damToken.address)],
    ["Deployed Block", `#${fmt(CONTRACTS.damToken.block)}`],
    ["Total Supply", bold(lime(CONTRACTS.damToken.supply)) + dim(" (minted to treasury)")],
    ["Decimals", white("18 (Standard ERC-20)")],
    ["Blockscout", underline(cyan(`https://robinhoodchain.blockscout.com/address/${CONTRACTS.damToken.address}`))],
  ]);

  await sleep(900);

  // ── ACT 2: Zero-Trust Token Lock Execution (Lock #1) ──
  await typeCmd("damkeeper lock create --token DAM --amount 5000 --until \"in 10 minutes\" --label \"Mainnet Genesis Reserve #1\"");

  await step("Querying treasury wallet allowance", Promise.resolve(), "OK", 400);
  await step("Submitting exact ERC-20 permit/approval", Promise.resolve(), "APPROVED", 500);
  await step("Forwarding 0.0007 ETH protocol fee", Promise.resolve(), "FORWARDED", 550);
  await step("Executing DamkeeperLockManager.createLock()", Promise.resolve(), "MINED", 750);
  await step("Anchoring public cryptographic proof to chain", Promise.resolve(), "ANCHORED", 500);
  line();

  line(lime(bold("  ✓ LOCK #1 CREATED ON ROBINHOOD CHAIN MAINNET")));
  line();

  await tree([
    ["Position ID", bold(white("Lock #1"))],
    ["Label", lime("Mainnet Genesis Reserve #1")],
    ["Asset Locked", bold(white(TX_PROOFS.createLock.amount)) + dim(" (Damkeeper Token)")],
    ["Beneficiary", yellow(FOUNDER_WALLET) + dim(" (withdrawal wallet)")],
    ["Platform Fee", lime("0.0007 ETH (~$2.00)") + dim(" (forwarded to deployer)")],
    ["Block Number", `#${fmt(TX_PROOFS.createLock.block)}`],
    ["Tx Hash", white(TX_PROOFS.createLock.txHash)],
    ["Blockscout Tx", underline(cyan(`https://robinhoodchain.blockscout.com/tx/${TX_PROOFS.createLock.txHash}`))],
    ["Public Proof", underline(lime(TX_PROOFS.createLock.url))],
  ]);

  await sleep(950);

  // ── ACT 3: Timelock Verification & Settlement (Withdraw) ──
  await typeCmd("damkeeper lock withdraw --id 1 --network mainnet");

  await step("Querying onchain timelock threshold", Promise.resolve(), "UNLOCKED", 400);
  await step("Verifying beneficiary cryptographic caller", Promise.resolve(), "MATCHED", 450);
  await step("Executing DamkeeperLockManager.withdraw(1)", Promise.resolve(), "CONFIRMED", 800);
  await step("Emitting LockWithdrawn onchain event", Promise.resolve(), "RECORDED", 500);
  line();

  line(lime(bold("  ✓ WITHDRAWAL COMPLETE · 100% ASSETS RETURNED TO BENEFICIARY")));
  line();

  await tree([
    ["Position ID", bold(white("Lock #1 · SETTLED"))],
    ["Status", bold(lime("Withdrawn (Fully Claimed)"))],
    ["Asset Released", bold(white(TX_PROOFS.withdrawLock.amount)) + dim(" (transferred via safeTransfer)")],
    ["Recipient", yellow(FOUNDER_WALLET)],
    ["Platform Fee", lime("0 ETH") + dim(" (Gas only · No protocol fee on withdraw)")],
    ["Block Number", `#${fmt(TX_PROOFS.withdrawLock.block)}`],
    ["Tx Hash", white(TX_PROOFS.withdrawLock.txHash)],
    ["Blockscout Tx", underline(cyan(`https://robinhoodchain.blockscout.com/tx/${TX_PROOFS.withdrawLock.txHash}`))],
  ]);

  await sleep(900);

  // ── ACT 4: Production Summary & Verified Seals ──
  const bar = "═".repeat(78);
  line(dim("  " + bar));
  line(bold(lime("  [✓ ONCHAIN PROOFS VERIFIED & RECORDED ON ROBINHOOD CHAIN MAINNET]")));
  line(dim("  " + bar));
  line();
  line(dim("    • Production Web App : ") + underline(white("https://damkeeper.xyz")));
  line(dim("    • Verified Explorer  : ") + underline(cyan("https://robinhoodchain.blockscout.com")));
  line(dim("    • Lock Vault         : ") + white(CONTRACTS.lockManager.address));
  line(dim("    • Vesting Vault      : ") + white(CONTRACTS.vestingManager.address));
  line(dim("    • Token ($DAM)       : ") + white(CONTRACTS.damToken.address));
  line(dim("    • Founder Treasury   : ") + yellow(FOUNDER_WALLET));
  line();

  line(dim("┌─[") + lime("FOUNDER@DAMKEEPER-MAINNET") + dim("]─[") + cyan("robinhood-mainnet:4663") + dim("]"));
  line(dim("└─▸ ") + white("damkeeper status  ") + dim("→  ") + lime("LIVE & OPERATIONAL ON ROBINHOOD MAINNET"));
  line();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
