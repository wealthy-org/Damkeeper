import { Command } from "commander";
import { banner, c, fail, isJson } from "./ui";
import { account, TESTNET } from "./config";
import { claimCmd, lockCreate, vestingCreate, withdrawCmd } from "./write";
import { burnCmd } from "./burn";
import {
  stakingClaimCmd,
  stakingCreateCmd,
  stakingListCmd,
  stakingPoolCmd,
  stakingStakeCmd,
  stakingUnstakeCmd,
} from "./staking";
import {
  airdropCheckCmd,
  airdropClaimCmd,
  airdropCreateCmd,
  airdropInfoCmd,
  airdropListCmd,
} from "./airdrop";
import { contractsCmd, exploreCmd, positionsCmd, showCmd, statusCmd, tokensCmd } from "./read";
import { balanceCmd, faucetCmd, homeCmd, loginCmd, logoutCmd, shareCmd } from "./misc";
import { showcaseCmd } from "./showcase";
import { loadSession } from "./session";

const VERSION = "0.1.0";

const PANEL = `
  ${c.bold("USAGE")}   damkeeper <command> [options]

  ${c.lime("START HERE")}
    login                    Check or connect your wallet via browser/Phantom
    logout                   Disconnect active terminal session
    balance                  Check your gas ETH and token balances
    faucet                   Get 1,000 EXMPL test tokens (once per 24h)
    home                     Platform status + your positions

  ${c.lime("CREATE")}
    lock create              Hold tokens until one fixed unlock date
    vesting create           Release tokens per second, optional cliff

  ${c.lime("STAKING & YIELD")}
    staking                  List active staking reward pools
    staking pool <address>   Inspect pool state, rates and your staked yield
    staking stake [address]  Stake tokens into pool to earn yield
    staking unstake [address] Unstake principal tokens
    staking claim [address]  Harvest earned reward tokens
    staking create           Launch new community staking pool via factory

  ${c.lime("AIRDROPS")}
    airdrop                  List active token airdrops
    airdrop check [address]  Check your wallet's claimable allocations
    airdrop claim [id]       Claim your allocated tokens
    airdrop create           Deploy new community airdrop with CSV

  ${c.lime("BURN & SUPPLY")}
    burn                     Permanently destroy tokens via burn() or dead sink

  ${c.lime("MANAGE")}
    positions                Your locks and vesting  [--incoming --outgoing --type]
    withdraw <lock-id>       Take tokens out of an unlocked lock
    claim <vesting-id>       Claim what has vested
    share <kind> <id>        Caption and link for a position

  ${c.lime("LOOK UP")}  ${c.dim("(no wallet needed)")}
    show <kind> <id>         Full proof page for one position
    explore                  Every lock and vesting  [--type --q]
    tokens                   Tokens with positions   [--q]
    contracts                Addresses, verified source, admin
    status                   Indexer progress and freshness

  ${c.lime("OPTIONS")}
    --json      Machine-readable output (no banner, no colors)
    --yes       Skip the confirmation prompt (for scripts)
    --help      Help with examples for any command:  damkeeper lock create --help

  ${c.lime("DATES")}   +10m minutes · +2h · +3d · +1w · +3mo months · +1y · or 2027-03-30 17:00

  ${c.dim("New here?  Run  damkeeper faucet  then  damkeeper lock create")}
`;

function statusLine() {
  try {
    const session = loadSession();
    const a = session?.authorizedBy ?? account().address;
    return c.dim(`  v${VERSION} · ${TESTNET.name} (${TESTNET.id}) · wallet ${a.slice(0, 6)}…${a.slice(-4)}${session?.authorizedBy ? " (Phantom)" : ""}`);
  } catch {
    return c.dim(`  v${VERSION} · ${TESTNET.name} (${TESTNET.id}) · wallet: not connected — run damkeeper login`);
  }
}

const program = new Command();
program
  .name("damkeeper")
  .version(VERSION, "-v, --version")
  .option("--json", "machine-readable output")
  .showSuggestionAfterError(true)
  .showHelpAfterError(false)
  .configureOutput({ outputError: (s) => process.stderr.write(`\n  ${c.red("✗")} ${s.replace(/^error: /, "")}`) });

const run = <A extends unknown[]>(fn: (...a: A) => Promise<void>) => async (...a: A) => {
  try {
    await fn(...a);
  } catch (e) {
    fail(e);
  }
};

program.command("login").description("Check your wallet, network and gas balance").action(run(loginCmd));
program.command("logout").description("Disconnect active terminal session").action(run(logoutCmd));
program.command("balance").description("Check your gas ETH and token balances")
  .option("--wallet <address>", "look up another wallet")
  .action(run(balanceCmd));
program.command("faucet [address]").description("Get 1,000 EXMPL test tokens (once per 24h)")
  .addHelpText("after", "\nExamples:\n  damkeeper faucet\n  damkeeper faucet 0xb91E…B5AE").action(run(faucetCmd));
program.command("home").description("Platform status + your positions").action(run(homeCmd));

const lock = program.command("lock").description("Token locks");
lock.command("create").description("Hold tokens until one fixed unlock date")
  .option("--token <address>").option("--amount <n>").option("--to <address|self>", "withdrawal wallet", undefined)
  .option("--unlock <when>", "+10m, +3mo, +1y or 2027-03-30 17:00").option("--title <text>", "optional offchain label, signed by you")
  .option("-y, --yes", "skip the confirmation prompt")
  .addHelpText("after", "\nRun with no flags to be prompted for each value.\n\nExamples:\n  damkeeper lock create\n  damkeeper lock create --token 0xb5b0… --amount 1000 --to self --unlock +1y --title \"Team tokens\" --yes")
  .action(run(lockCreate));

const vesting = program.command("vesting").description("Linear vesting");
vesting.command("create").description("Release tokens per second, optional cliff")
  .option("--token <address>").option("--amount <n>").option("--to <address|self>", "beneficiary")
  .option("--start <when>", "now, +1d or a date").option("--cliff <when>", "optional; measured from the start").option("--end <when>", "+1y, +2y or a date")
  .option("--title <text>").option("-y, --yes", "skip the confirmation prompt")
  .addHelpText("after", "\nExamples:\n  damkeeper vesting create\n  damkeeper vesting create --token 0xb5b0… --amount 1200 --to 0xAlice… --start now --cliff +3mo --end +1y")
  .action(run(vestingCreate));

const staking = program.command("staking").description("Staking reward pools and continuous yields")
  .action(run(stakingListCmd));

staking.command("list").description("List all active staking pools on Robinhood Chain")
  .action(run(stakingListCmd));

staking.command("pool [address]").description("Inspect pool state, rates, and user earned yield")
  .action(run((addr) => stakingPoolCmd(addr)));

staking.command("stake [address]").description("Stake tokens into pool")
  .option("--amount <n>", "amount to stake (e.g. 1000 or max)")
  .option("-y, --yes", "skip confirmation prompt")
  .action(run((addr, opts) => stakingStakeCmd(addr, opts)));

staking.command("unstake [address]").description("Unstake principal tokens from pool")
  .option("--amount <n>", "amount to unstake (e.g. 1000 or max)")
  .option("--emergency", "emergency withdraw principal without reward calculation")
  .option("-y, --yes", "skip confirmation prompt")
  .action(run((addr, opts) => stakingUnstakeCmd(addr, opts)));

staking.command("claim [address]").description("Harvest earned reward tokens")
  .option("-y, --yes", "skip confirmation prompt")
  .action(run((addr, opts) => stakingClaimCmd(addr, opts)));

staking.command("create").description("Deploy a new community staking pool via factory")
  .option("--staking-token <address>", "token to deposit")
  .option("--reward-token <address>", "token to reward")
  .option("--lock-days <n>", "timelock duration in days (0 for flexible)")
  .option("--name <text>", "pool name")
  .option("-y, --yes", "skip confirmation prompt")
  .action(run(stakingCreateCmd));

const airdrop = program.command("airdrop").description("Token airdrops & community claims")
  .action(run(airdropListCmd));

airdrop.command("list").description("List all active token airdrops")
  .action(run(airdropListCmd));

airdrop.command("check [address]").description("Check your wallet eligibility across all airdrops")
  .action(run((addr) => airdropCheckCmd(addr)));

airdrop.command("claim [campaignId]").description("Claim your allocated tokens from an airdrop")
  .option("-y, --yes", "skip confirmation prompt")
  .action(run((id, opts) => airdropClaimCmd(id, opts)));

airdrop.command("create").description("Deploy a new token airdrop campaign")
  .option("--name <text>", "campaign title")
  .option("--token <address>", "token to distribute")
  .option("--file <path>", "path to CSV file (address, amount)")
  .option("--mode <instant|vesting>", "claim distribution mode")
  .option("-y, --yes", "skip confirmation prompt")
  .action(run(airdropCreateCmd));

airdrop.command("info <campaignId>").description("Inspect airdrop campaign details")
  .action(run((id) => airdropInfoCmd(id)));

program.command("burn").description("Permanently burn tokens via native burn() or dead address sink")
  .option("--token <address>", "token contract address (default: $DAM)")
  .option("--amount <n>", "amount to burn (e.g. 1000 or max)")
  .option("--mode <burn|dead>", "execution mechanism: 'burn' or 'dead'")
  .option("-y, --yes", "skip the confirmation prompt")
  .addHelpText("after", "\nRun with no flags to be prompted for each value.\n\nExamples:\n  damkeeper burn\n  damkeeper burn --amount 1000\n  damkeeper burn --amount max --yes\n  damkeeper burn --token 0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4 --amount 500 --mode dead")
  .action(run(burnCmd));

program.command("positions").description("Your locks and vesting")
  .option("--wallet <address>", "look up another wallet").option("--type <lock|vesting>").option("--incoming", "you are the beneficiary").option("--outgoing", "you created it")
  .action(run(async (o) => {
    const session = loadSession();
    const target = o.wallet ?? session?.authorizedBy ?? account().address;
    return positionsCmd({ ...o, wallet: target });
  }));
program.command("withdraw <lock-id>").description("Take tokens out of an unlocked lock").option("-y, --yes").action(run(withdrawCmd));
program.command("claim <vesting-id>").description("Claim what has vested").option("-y, --yes").action(run(claimCmd));
program.command("share <kind> [id]").description("Caption and link for a position or staking pool").action(run(shareCmd));
program.command("show <kind> <id>").description("Full proof page for one position")
  .addHelpText("after", "\nExamples:\n  damkeeper show lock 1\n  damkeeper show vesting 1 --json").action(run(showCmd));
program.command("explore").description("Every lock and vesting").option("--type <lock|vesting>").option("--q <text>", "address, symbol, label or position number").action(run(exploreCmd));
program.command("tokens").description("Tokens with positions").option("--q <text>").action(run(tokensCmd));
program.command("showcase").description("Hacker-style deployment & verification demo showcase")
  .option("--live", "live interaction")
  .option("--replay", "replay verified onchain transaction log (default)")
  .action(run(showcaseCmd));
program.command("contracts").description("Addresses, verified source, admin").action(run(contractsCmd));
program.command("status").description("Indexer progress and freshness").action(run(statusCmd));

const args = process.argv.slice(2).filter((a) => a !== "--json");
if (args.length === 0) {
  banner();
  if (!isJson()) {
    console.log(statusLine());
    console.log(PANEL);
  }
} else {
  if (!["-h", "--help", "-v", "--version", "help"].includes(args[0]) && process.stdout.isTTY && !isJson()) banner();
  program.parseAsync(process.argv).catch(fail);
}
