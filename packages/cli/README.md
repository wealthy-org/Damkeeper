# @damkeeper/cli

> Command-line interface for Damkeeper token locks and linear vesting on Robinhood Chain.

[![npm version](https://img.shields.io/npm/v/@damkeeper/cli.svg)](https://www.npmjs.com/package/@damkeeper/cli)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Damkeeper CLI lets developers, project founders, and treasuries manage token locks, linear vesting schedules, and verifiable on-chain proofs directly from their terminal without needing to clone or build the web application.

---

## ⚡ Installation

Install globally using npm, yarn, or pnpm:

```bash
npm install -g @damkeeper/cli
# or
pnpm add -g @damkeeper/cli
# or
yarn global add @damkeeper/cli
```

Or run directly with `npx`:

```bash
npx @damkeeper/cli login
```

---

## 🚀 Quick Start

### 1. Authenticate with your Wallet

Login launches a local authorization flow in your browser supporting Robinhood Wallet, Phantom, MetaMask, or any EIP-1193 wallet:

```bash
damkeeper login
```

### 2. Fund your Account with Test Tokens

Get 1,000 free EXMPL testnet tokens to test lock & vesting flows:

```bash
damkeeper faucet
```

### 3. Check your Balances

```bash
damkeeper balance
```

### 4. Create a Token Lock

Lock 100 tokens until 30 days from now with an on-chain message:

```bash
damkeeper lock create --token 0xb5b0f97B643306D540cAe82F50970cF6F9D75538 --amount 100 --until "in 30 days" --label "Team Reserve Lock"
```

### 5. Create a Linear Vesting Schedule

Create a 12-month vesting schedule with a 3-month cliff:

```bash
damkeeper vesting create --token 0xb5b0f97B643306D540cAe82F50970cF6F9D75538 --amount 50000 --beneficiary 0xRecipient... --start "now" --duration "365 days" --cliff "90 days"
```

### 6. Inspect & Claim Positions

```bash
# List all your active positions
damkeeper positions

# Check detailed status and proof of a lock or vesting
damkeeper show lock 1
damkeeper show vesting 1

# Claim vested tokens
damkeeper claim 1

# Withdraw expired lock
damkeeper withdraw 1
```

---

## 🛠 Commands Reference

| Command | Description |
| :--- | :--- |
| `damkeeper login` | Connect your browser wallet & initialize session |
| `damkeeper logout` | Disconnect session and clear local credentials |
| `damkeeper balance` | Check native gas ETH and token balances |
| `damkeeper faucet` | Claim 1,000 EXMPL test tokens (24h cooldown) |
| `damkeeper positions` | Overview of all your locks and vesting streams |
| `damkeeper lock create` | Lock ERC-20 tokens until a specified timestamp |
| `damkeeper vesting create` | Create a linear token vesting schedule |
| `damkeeper claim <id>` | Claim available vested tokens from a stream |
| `damkeeper withdraw <id>` | Withdraw unlocked tokens after lock expiry |
| `damkeeper show <kind> <id>` | Display complete on-chain proof & schedule |
| `damkeeper share <kind> <id>` | Generate human-readable share card and verification URL |
| `damkeeper explore` | Browse global locks and vesting on Robinhood Chain |
| `damkeeper contracts` | List verified deployment addresses and Blockscout links |
| `damkeeper showcase` | Interactive hacker-style demo showcase |

---

## ⚙️ Configuration & Custom RPC

The CLI works completely out of the box with default Robinhood Chain Testnet parameters.

If you have your own dedicated RPC provider (e.g. Alchemy), you can configure it via environment variables or a configuration file at `~/.damkeeper/config`:

```bash
# In ~/.damkeeper/config
DAMKEEPER_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/YOUR_API_KEY
```

Or via environment variables:

```bash
export DAMKEEPER_RPC_URL="https://robinhood-testnet.g.alchemy.com/v2/YOUR_API_KEY"
```

---

## 🛡 Network Details (Robinhood Chain Testnet)

- **Network Name**: Robinhood Chain Testnet
- **Chain ID**: `46630`
- **Native Currency**: ETH
- **Lock Manager**: `0x335B2fba8845EfC3E74F8A4b4AD664D32Eba0AcF`
- **Vesting Manager**: `0xfD91fe9daaC8BDb886cD89A53d3Ba40421cb6efd`
- **Explorer**: [https://explorer.testnet.chain.robinhood.com](https://explorer.testnet.chain.robinhood.com)

---

## 📄 License

MIT © [Damkeeper](https://damkeeper.xyz)
