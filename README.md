# Damkeeper

> Token locks and linear vesting on Robinhood Chain — verifiable on-chain proof for project founders, token treasuries, and community trust.

[![Tests](https://img.shields.io/badge/Foundry%20Tests-26%20passed-brightgreen.svg)](#contracts)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue.svg)](packages/contracts)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](apps/web)
[![Network](https://img.shields.io/badge/Robinhood%20Chain-46630%20%7C%204663-lime.svg)](https://robinhoodchain.blockscout.com)
[![Web](https://img.shields.io/badge/Live%20App-damkeeper.xyz-emerald.svg)](https://damkeeper.xyz)
[![X](https://img.shields.io/badge/Follow-@damkeeper__fi-1DA1F2.svg)](https://x.com/damkeeper_fi)

Full design specification and requirements are documented in [brief.md](brief.md).

---

## 🌐 Live Links

- **Live Production App**: [https://damkeeper.xyz](https://damkeeper.xyz)
- **Official X (Twitter)**: [https://x.com/damkeeper_fi](https://x.com/damkeeper_fi)
- **Interactive Showcase**: `npm run showcase` (instant terminal terminal walkthrough with live Blockscout explorer proofs)
- **Standalone CLI**: `@damkeeper/cli` (`packages/cli`)

---

## 📌 Status & Network Support

### 1. Robinhood Chain Mainnet (Live & Operational)
All core smart contracts are deployed, live, verified, and operational on Robinhood Chain Mainnet (Chain ID `4663`). Real create → withdraw (lock) cycles and vesting contracts are executed with on-chain cryptographic proofs.

| Contract / Asset | Address | Explorer | Details |
| :--- | :--- | :--- | :--- |
| `DamkeeperLockManager` | `0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE` | [Blockscout](https://robinhoodchain.blockscout.com/address/0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE) | Deployed at block `78024101`. Fee `0.0007 ETH` (~$2.00). |
| `DamkeeperVestingManager` | `0xC07D54bd8e87442dB58f6A0cCca71489307c70f5` | [Blockscout](https://robinhoodchain.blockscout.com/address/0xC07D54bd8e87442dB58f6A0cCca71489307c70f5) | Deployed at block `78059319`. Policy enabled & unpaused. |
| `Damkeeper Token` ($DAM) | `0x8Fc5E1dFaeB1a4311CbBF8A387F3db530B78F3e0` | [Blockscout](https://robinhoodchain.blockscout.com/token/0x8Fc5E1dFaeB1a4311CbBF8A387F3db530B78F3e0) | Official 10,000,000 supply deployed at block `78023915`. |
| Founder / Deployer Admin | `0x9178B573219C55586BbAf51Ecb24ACfb27BB7681` | [Blockscout](https://robinhoodchain.blockscout.com/address/0x9178B573219C55586BbAf51Ecb24ACfb27BB7681) | Platform admin & fee recipient. |

Full Mainnet deployment metadata is recorded in [`packages/config/manifest.mainnet.json`](packages/config/manifest.mainnet.json).

### 2. Robinhood Chain Testnet (Development & QA)
Active on Robinhood Chain Testnet (Chain ID `46630`) for testing and integration:

| Contract | Address | Explorer |
| :--- | :--- | :--- |
| `DamkeeperLockManager` | `0x335B2fba8845EfC3E74F8A4b4AD664D32Eba0AcF` | [Blockscout](https://explorer.testnet.chain.robinhood.com/address/0x335b2fba8845efc3e74f8a4b4ad664d32eba0acf) |
| `DamkeeperVestingManager` | `0xfD91fe9daaC8BDb886cD89A53d3Ba40421cb6efd` | [Blockscout](https://explorer.testnet.chain.robinhood.com/address/0xfd91fe9daac8bdb886cd89a53d3ba40421cb6efd) |
| `ExampleToken` (EXMPL) | `0xb5b0f97B643306D540cAe82F50970cF6F9D75538` | [Blockscout](https://explorer.testnet.chain.robinhood.com/address/0xb5b0f97B643306D540cAe82F50970cF6F9D75538) |

Full testnet deployment metadata is recorded in [`packages/config/manifest.testnet.json`](packages/config/manifest.testnet.json).

---

## ⚡ Key Features

- **Standard Fixed-Duration Locks**: Lock any admitted ERC-20 token until an exact future Unix timestamp. Non-custodial, immutable withdrawal after unlock.
- **Continuous Linear Vesting**: Linear second-by-second release with optional cliff period. Independent reference mathematical model verified via property-based fuzz tests.
- **$2 Anti-Spam / Platform Fee**: Each `createLock` collects a fixed sustainable fee of `0.0007 ETH` (~$2.00 USD) forwarded directly to the configured treasury/admin recipient via Checks-Effects-Interactions (CEI).
- **Security Whitelist Policy**: Token policies with configurable liability caps (`setTokenPolicy`) prevent malicious tokens or fee-on-transfer discrepancies.
- **Verifiable Proof URLs**: Shareable public proof pages (`/positions/:chainId/:manager/:id`) displaying on-chain schedules, unlock countdowns, and explorer links.
- **USDT & Non-Standard ERC-20 Compatibility**: Automatic 0-allowance reset before approving, preventing reverts on legacy token implementations.
- **Offline & CLI Access**: Standalone CLI (`@damkeeper/cli`) capable of reading on-chain positions, managing locks/vesting, and generating proofs directly from terminal.

---

## 📁 Repository Structure

```
├── apps/
│   └── web/                # Next.js 14 App Router (Tailwind + Vanilla CSS, Drizzle, Neon, Wagmi/Viem)
├── packages/
│   ├── contracts/          # Solidity 0.8.24 contracts (Foundry), tests, and deployment scripts
│   ├── cli/                # Standalone @damkeeper/cli bundled with tsup (~62 KB ESM)
│   ├── domain/             # Shared pure domain logic & reference math models
│   └── config/             # Network manifests and deployment registries
├── scripts/
│   └── run.ts              # Interactive hacker-style terminal showcase
└── docs/                   # Architecture Decision Records (ADRs) & operations runbooks
```

---

## 🧪 Smart Contracts & Test Suite

Contracts are written in Solidity `0.8.24` and tested with Foundry.

### Test Coverage (26 Passing Tests)
- **17 Unit Tests for LockManager**: Creation, unlock timestamps, withdrawal validation, double-withdraw reverts, zero-amount protection, pause mechanics, admission policy caps, fee payment forwarding (`0.0007 ETH`), insufficient fee reverts, and admin fee adjustments.
- **6 Unit Tests for VestingManager**: Linear claim calculation, cliff boundary tests, mid-point claims, post-end claims, and non-beneficiary protection.
- **2 Fuzz Tests (512 runs each)**: Vesting formula mathematically verified against an independent reference model (`mulDiv` property tests).
- **1 Invariant Test (128 runs × 8192 calls)**: State handler asserting `balanceOf(manager) >= totalLiability` and ghost liability consistency across random fuzz sequences.

### Run Tests Locally

```bash
cd packages/contracts
forge test -vvv
```

### Deployment Scripts

Both `DamkeeperLockManager` and `DamkeeperVestingManager` are live on Mainnet. To deploy fresh instances or inspect the scripts:

```bash
cd packages/contracts
export DEPLOYER_PRIVATE_KEY="0x..."
export MAINNET_RPC_URL="https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY"

# Deploy LockManager
forge script script/DeployLock.s.sol:DeployLock --rpc-url $MAINNET_RPC_URL --broadcast

# Deploy VestingManager (includes policy & unpause)
forge script script/DeployVesting.s.sol:DeployVesting --rpc-url $MAINNET_RPC_URL --broadcast
```

---

## 🖥️ Damkeeper CLI (`@damkeeper/cli`)

The CLI is a standalone binary that provides 100% feature parity with the web dashboard.

```bash
# Run via npx directly
npx @damkeeper/cli login

# Or install globally
npm install -g @damkeeper/cli
```

### CLI Command Summary

| Command | Action |
| :--- | :--- |
| `damkeeper login` | Interactive browser wallet session login |
| `damkeeper balance` | Check ETH gas and token balances |
| `damkeeper faucet` | Claim 1,000 EXMPL testnet tokens |
| `damkeeper positions` | List all locks and vesting positions for current wallet |
| `damkeeper lock create` | Create a token lock with custom unlock duration and optional offchain title |
| `damkeeper vesting create` | Create a linear vesting stream with optional cliff |
| `damkeeper withdraw <id>` | Withdraw unlocked tokens after expiry |
| `damkeeper claim <id>` | Claim currently claimable vested tokens |
| `damkeeper show <kind> <id>` | View complete on-chain schedule & verifiable proof |
| `damkeeper share <kind> <id>` | Formatted social sharing link & ASCII badge |
| `damkeeper showcase` | Launch interactive terminal showcase |

---

## 🚀 Hacker Showcase Demo

Experience the full verification and developer showcase directly in your terminal:

```bash
npm run showcase
```

This presents a live terminal HUD displaying contract statuses, active verified positions, and direct Blockscout / web links.

---

## 💻 Web Application & Local Development

The web frontend is built using Next.js 14 App Router, TailwindCSS + custom luxury typography tokens, Drizzle ORM, and Wagmi/Viem.

```bash
# 1. Install root dependencies
npm install

# 2. Copy environment file
cp apps/web/.env.example apps/web/.env.local

# 3. Generate & apply database migrations (Neon Serverless Postgres)
npm run db:generate --workspace=apps/web
npm run db:migrate --workspace=apps/web

# 4. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the landing page, connect a wallet, and interact with contracts.

---

## 📄 License

MIT © [Damkeeper](https://damkeeper.xyz)
