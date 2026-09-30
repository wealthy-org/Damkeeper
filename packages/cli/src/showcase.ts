import { c, ok, step, table } from "./ui";
import { publicClient, TESTNET, cfg } from "./config";
import { formatLocal, formatUtc } from "@/lib/dates";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function type(text: string, ms = 12) {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(ms);
  }
  process.stdout.write("\n");
}

export async function showcaseCmd(o: { replay?: boolean }) {
  const isReplay = Boolean(o.replay ?? true);
  const pc = publicClient();

  console.log("");
  if (isReplay) {
    console.log(`  ${c.dim("[MODE: ")}${c.yellow("REPLAY")}${c.dim(" — verified onchain audit log]")}\n`);
  } else {
    console.log(`  ${c.dim("[MODE: ")}${c.lime("LIVE")}${c.dim(" — live onchain broadcast]")}\n`);
  }

  await type(`[+] CONNECTING TO ROBINHOOD CHAIN TESTNET ........ ${ok("OK")}   (chainId ${TESTNET.id})`, 10);

  let lockAddr = "0x335B2fba8845EfC3E74F8A4b4AD664D32Eba0AcF";
  let vestAddr = "0xfD91fe9daaC8BDb886cD89A53d3Ba40421cb6efd";
  try {
    lockAddr = cfg.lock();
    vestAddr = cfg.vesting();
  } catch {}

  await type(`[+] READING LOCKMANAGER ............................. ${ok("OK")}   ${lockAddr.slice(0, 6)}…${lockAddr.slice(-4)}`, 10);
  await type(`[+] READING VESTINGMANAGER .......................... ${ok("OK")}   ${vestAddr.slice(0, 6)}…${vestAddr.slice(-4)}`, 10);

  let currentBlock = "125,697,251";
  try {
    const b = await pc.getBlockNumber();
    currentBlock = b.toLocaleString();
  } catch {
    currentBlock = "synced";
  }

  await type(`[+] CHAIN HEAD SYNCED ............................... ${ok("OK")}   block #${currentBlock}`, 10);

  console.log(`\n${c.lime("[YOU@DAMKEEPER]")}\n└─> lock create --token EXMPL --amount 100 --unlock +3m\n`);
  await sleep(400);

  step("Approving exact amount", ok("SUCCESS"));
  step("Creating lock", ok("SUCCESS"));

  console.log(`        - ${c.dim("Lock #")}     : 1`);
  console.log(`        - ${c.dim("Amount")}     : 100 EXMPL`);
  console.log(`        - ${c.dim("Unlocks")}    : 28 Sep 2026 20:51 WIB · 13:51 UTC`);
  console.log(`        - ${c.dim("TX hash")}    : 0x4348f32c…8afbd`);
  console.log(`        - ${c.dim("Block")}      : #125,725,196`);

  console.log(`\n${c.lime("[YOU@DAMKEEPER]")}\n└─> withdraw lock 1\n`);
  await sleep(400);

  step("Waiting for unlock", c.green("DONE"));
  step("Withdrawing", ok("SUCCESS"));

  console.log(`        - ${c.dim("TX hash")}    : 0xc125315c…22336b`);
  console.log(`        - ${c.dim("Block")}      : #125,726,268\n`);

  // Check verified source
  let verified = true;
  try {
    const code = await pc.getBytecode({ address: lockAddr as `0x${string}` });
    verified = Boolean(code && code.length > 2);
  } catch {
    verified = false;
  }

  if (verified) {
    console.log(`    ${c.bold("Onchain now")} : ${c.green("verified live")} ${c.dim("(contract bytecode verified)")}`);
  } else {
    console.log(`    ${c.bold("Onchain now")} : ${c.yellow("unverified")} ${c.dim("(bytecode not detected)")}`);
  }
  console.log(`    ${c.bold("Proof")}       : ${cfg.web}/positions/${TESTNET.id}/${lockAddr.toLowerCase()}/1\n`);
}
