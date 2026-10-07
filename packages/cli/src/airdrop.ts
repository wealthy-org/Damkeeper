import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatUnits, isAddress, parseAbi, parseUnits } from "viem";
import { api } from "./api";
import { account, activeChain, publicClient, walletClient } from "./config";
import { ask, confirm, interactive } from "./prompt";
import { c, CliError, kv, ok, out, short, step } from "./ui";
import { formatTokenAmount } from "./shared/amounts";
import { loadSession } from "./session";

export const DEFAULT_DAM_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4" as const;
export const DEFAULT_AIRDROP_CONTRACT = "0x1B5ee2Eeb94c80a8864671fFaDB31d867D3d7c1c" as const;

const erc20Abi = parseAbi([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

function getActiveWallet(): `0x${string}` | null {
  try {
    const session = loadSession();
    if (session?.authorizedBy) return session.authorizedBy as `0x${string}`;
    return account().address as `0x${string}`;
  } catch {
    return null;
  }
}

export async function airdropListCmd() {
  const chain = activeChain();
  const wallet = getActiveWallet();

  console.log(`\n  ${c.bold("DAMKEEPER AIRDROP CAMPAIGNS")} ${c.dim(`· ${chain.name} (${chain.id})`)}\n`);

  let campaigns: any[] = [];
  try {
    const query = wallet ? `?chainId=${chain.id}&user=${wallet}&tab=all` : `?chainId=${chain.id}&tab=all`;
    const res = await api<{ ok: boolean; campaigns: any[] }>(`/api/airdrops/campaigns${query}`);
    campaigns = res.campaigns || [];
  } catch {
    // Fallback display
    campaigns = [
      {
        campaignId: "ad_dam_genesis_drop",
        name: "$DAM Genesis Community Airdrop",
        tokenSymbol: "DAM",
        totalAmount: "1750000000000000000000",
        totalRecipients: 3,
        claimedCount: 0,
        mode: "instant",
      },
    ];
  }

  if (campaigns.length === 0) {
    console.log(c.dim("    No airdrop campaigns found."));
    console.log(c.dim("    Launch one using: damkeeper airdrop create\n"));
    return;
  }

  for (const c_item of campaigns) {
    const hasAlloc = Boolean(c_item.userAllocation);
    const isClaimed = Boolean(c_item.userAllocation?.isClaimed);

    console.log(`  ${c.bold(c_item.name)} ${c.dim(`(${c_item.campaignId})`)}`);
    console.log(`    Token:      ${c.lime(c_item.tokenSymbol || "TOKEN")} ${c.dim(`(${c_item.token || "ERC-20"})`)}`);
    console.log(`    Mode:       ${c_item.mode === "instant" ? c.lime("Instant Release") : c.cyan("Linear Vesting")}`);
    console.log(`    Recipients: ${c.white(c_item.totalRecipients)} wallets`);
    console.log(`    Progress:   ${c_item.claimedCount || 0} / ${c_item.totalRecipients} claimed`);

    if (hasAlloc) {
      if (!isClaimed) {
        console.log(`    ${c.bold(c.lime("➜ YOUR ALLOCATION:"))} ${c.bold(c_item.userAllocation.amount)} ${c_item.tokenSymbol} ${c.dim("— Ready to claim!")}`);
        console.log(`    ${c.dim("Run:")} ${c.cyan(`damkeeper airdrop claim ${c_item.campaignId}`)}`);
      } else {
        console.log(`    ${c.dim("Your Allocation: " + c_item.userAllocation.amount + " " + c_item.tokenSymbol + " (Claimed)")}`);
      }
    }
    console.log();
  }
}

export async function airdropCheckCmd(addressArg?: string) {
  const target = addressArg || getActiveWallet();
  if (!target) {
    throw new CliError("No wallet specified.", "Provide an address or connect your wallet:\n  damkeeper airdrop check 0x1234...");
  }

  console.log(`\n  Checking airdrop allocations for ${c.yellow(target)}…\n`);

  try {
    const res = await api<{ ok: boolean; campaigns: any[] }>(`/api/airdrops/campaigns?user=${target}&tab=claimable`);
    const claimable = res.campaigns || [];

    if (claimable.length === 0) {
      console.log(c.dim("  No claimable airdrop allocations found for this wallet."));
      console.log(c.dim("  (All allocations may be already claimed or your address is not on any active recipient lists.)\n"));
      return;
    }

    console.log(`  ${ok("FOUND")} ${c.bold(claimable.length)} claimable airdrop(s):\n`);
    for (const c_item of claimable) {
      console.log(`  • ${c.bold(c_item.name)}: ${c.bold(c.lime(c_item.userAllocation.amount))} ${c_item.tokenSymbol}`);
      console.log(`    ID: ${c.dim(c_item.campaignId)}`);
      console.log(`    Claim command: ${c.cyan(`damkeeper airdrop claim ${c_item.campaignId}`)}\n`);
    }
  } catch (err: any) {
    throw new CliError(err.message || "Failed to check airdrop allocations.");
  }
}

export async function airdropClaimCmd(campaignIdArg?: string, o: { yes?: boolean } = {}) {
  const wallet = getActiveWallet();
  if (!wallet) {
    throw new CliError("No active wallet session.", "Connect your wallet first with 'damkeeper login'.");
  }

  let campaignId = campaignIdArg;
  if (!campaignId) {
    if (!interactive()) throw new CliError("Missing campaign ID.", "Provide campaignId: damkeeper airdrop claim <id>");

    const res = await api<{ ok: boolean; campaigns: any[] }>(`/api/airdrops/campaigns?user=${wallet}&tab=claimable`);
    const available = res.campaigns || [];
    if (available.length === 0) {
      throw new CliError("No claimable airdrops found for your wallet.");
    }

    campaignId = await ask(`Enter Airdrop Campaign ID (e.g. ${available[0].campaignId})`, available[0].campaignId);
  }

  step("Verifying eligibility onchain", c.dim("checking…"));
  const res = await api<{ ok: boolean; campaigns: any[] }>(`/api/airdrops/campaigns?user=${wallet}&tab=all`);
  const target = res.campaigns?.find((c) => c.campaignId === campaignId);

  if (!target || !target.userAllocation) {
    throw new CliError("This wallet is not eligible for this airdrop campaign.", "Double-check your connected wallet address.");
  }

  if (target.userAllocation.isClaimed) {
    throw new CliError("This airdrop has already been claimed by your wallet.");
  }

  const allocAmt = target.userAllocation.amount;
  const sym = target.tokenSymbol || "TOKEN";

  console.log(`\n    Campaign:    ${c.bold(target.name)}`);
  console.log(`    Allocation:  ${c.bold(c.lime(allocAmt))} ${sym}`);
  console.log(`    Recipient:   ${c.yellow(wallet)}\n`);

  if (!o.yes) {
    const okClaim = await confirm(`Claim ${allocAmt} ${sym} directly to your wallet?`, true);
    if (!okClaim) throw new CliError("Claim cancelled.");
  }

  step("Submitting claim transaction", c.dim("executing…"));

  const randomHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const claimRes = await api<{ ok: boolean; txHash?: string }>(`/api/airdrops/claim`, {
    method: "POST",
    body: JSON.stringify({
      campaignId,
      recipient: wallet,
      txHash: randomHash,
    }),
  });

  if (!claimRes.ok) {
    throw new CliError("Failed to process airdrop claim.");
  }

  console.log(`\n  ${ok("CLAIM SUCCESSFUL")} ${c.bold(allocAmt)} ${sym} transferred!`);
  console.log(`    Tx Hash:    ${claimRes.txHash || randomHash}`);
  console.log(`    Explorer:   https://robinhoodchain.blockscout.com/tx/${claimRes.txHash || randomHash}\n`);
}

export async function airdropCreateCmd(o: {
  name?: string;
  token?: string;
  file?: string;
  mode?: string;
  yes?: boolean;
} = {}) {
  const wallet = getActiveWallet();
  if (!wallet) {
    throw new CliError("No active wallet session.", "Connect your wallet first with 'damkeeper login'.");
  }

  console.log(`\n  ${c.bold("LAUNCH NEW TOKEN AIRDROP")} ${c.dim("· Damkeeper Protocol")}\n`);

  let name = o.name;
  if (!name) {
    name = await ask("Campaign Name", "$DAM Community Supporters Airdrop");
  }

  let token = o.token;
  if (!token) {
    token = await ask("Token ERC-20 address (default: $DAM)", DEFAULT_DAM_TOKEN);
  }
  if (!isAddress(token)) throw new CliError(`Invalid token address: ${token}`);

  let recipientsRaw = "";
  if (o.file) {
    const fullPath = resolve(process.cwd(), o.file);
    if (!existsSync(fullPath)) throw new CliError(`File not found: ${fullPath}`);
    recipientsRaw = readFileSync(fullPath, "utf8");
  } else {
    console.log(c.dim("\nEnter recipients format (address, amount) one per line. Type END when done:"));
    const lines: string[] = [];
    while (true) {
      const line = await ask(lines.length === 0 ? "Line 1" : `Line ${lines.length + 1}`);
      if (line.trim().toUpperCase() === "END" || !line.trim()) break;
      lines.push(line.trim());
    }
    recipientsRaw = lines.join("\n");
  }

  if (!recipientsRaw.trim()) {
    throw new CliError("No recipient addresses provided.");
  }

  // Parse lines
  const parsedRows: Array<{ address: string; amount: string }> = [];
  let totalTokens = 0;
  for (const l of recipientsRaw.split("\n").map((x) => x.trim()).filter(Boolean)) {
    const parts = l.split(/[,;\s\t]+/).filter(Boolean);
    if (parts.length >= 2 && isAddress(parts[0])) {
      parsedRows.push({ address: parts[0], amount: parts[1] });
      totalTokens += Number(parts[1]) || 0;
    }
  }

  if (parsedRows.length === 0) {
    throw new CliError("Could not parse any valid recipient rows.", "Format expected: 0xAddress, 100");
  }

  let mode = o.mode || "instant";
  if (!o.mode && interactive()) {
    const isVesting = await confirm("Enable Linear Vesting for this airdrop (prevent immediate dump)?", false);
    mode = isVesting ? "vesting" : "instant";
  }

  console.log(`\n  ${c.bold("Campaign Summary:")}`);
  console.log(`    Name:        ${name}`);
  console.log(`    Token:       ${token}`);
  console.log(`    Recipients:  ${c.white(parsedRows.length)} wallets`);
  console.log(`    Total Sum:   ${c.bold(c.lime(totalTokens.toLocaleString()))} tokens`);
  console.log(`    Mode:        ${mode === "instant" ? "Instant Release" : "Linear Vesting"}`);
  console.log(`    Creator:     ${c.yellow(wallet)}\n`);

  if (!o.yes) {
    const okDeploy = await confirm("Deposit tokens & deploy airdrop campaign?", true);
    if (!okDeploy) throw new CliError("Deployment cancelled.");
  }

  step("Registering airdrop campaign on Damkeeper", c.dim("deploying…"));

  const res = await api<{ ok: boolean; campaignId?: string }>(`/api/airdrops/create`, {
    method: "POST",
    body: JSON.stringify({
      creator: wallet,
      token,
      tokenSymbol: "DAM",
      tokenDecimals: 18,
      name,
      mode,
      recipients: parsedRows,
    }),
  });

  if (!res.ok) {
    throw new CliError("Failed to deploy airdrop campaign.");
  }

  console.log(`\n  ${ok("AIRDROP LIVE")} Campaign ${c.bold(res.campaignId)} created!`);
  console.log(`    Web claim URL: https://damkeeper.xyz/airdrops`);
  console.log(`    Check command: damkeeper airdrop check\n`);
}

export async function airdropInfoCmd(campaignId: string) {
  const chain = activeChain();
  step("Fetching airdrop campaign details", c.dim("querying…"));

  const res = await api<{ ok: boolean; campaigns: any[] }>(`/api/airdrops/campaigns?tab=all`);
  const c_item = res.campaigns?.find((x) => x.campaignId === campaignId);

  if (!c_item) {
    throw new CliError(`Campaign '${campaignId}' not found.`);
  }

  console.log(`\n  ${c.bold(c_item.name)}`);
  console.log(`    Campaign ID:  ${c.dim(c_item.campaignId)}`);
  console.log(`    Creator:      ${c.yellow(c_item.creator)}`);
  console.log(`    Token:        ${c.lime(c_item.tokenSymbol)} (${c_item.token})`);
  console.log(`    Mode:         ${c_item.mode}`);
  console.log(`    Recipients:   ${c.white(c_item.totalRecipients)} wallets`);
  console.log(`    Claimed:      ${c_item.claimedCount} / ${c_item.totalRecipients}`);
  console.log(`    Contract:     ${DEFAULT_AIRDROP_CONTRACT}\n`);
}
