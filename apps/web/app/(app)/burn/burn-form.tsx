"use client";

import { useState } from "react";
import { useAccount, useConnect, useReadContract, usePublicClient } from "wagmi";
import { formatUnits, parseAbi } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import { formatTokenAmount, safeParseUnits } from "@/lib/amounts";
import { useTxFlow } from "@/lib/use-tx-flow";
import { useWrongNetwork } from "../wrong-network-banner";

const DEFAULT_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function burn(uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
]);

export function BurnForm() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const wrongNetwork = useWrongNetwork();
  const publicClient = usePublicClient();

  const [tokenAddress, setTokenAddress] = useState<string>(DEFAULT_TOKEN);
  const [amount, setAmount] = useState<string>("");
  const [burnMode, setBurnMode] = useState<"burn" | "dead">("burn");
  const [createdReceipt, setCreatedReceipt] = useState<{
    txHash: string;
    amount: string;
    symbol: string;
    initialSupply: string;
    newSupply: string;
    pctReduction: string;
  } | null>(null);

  const txFlow = useTxFlow();

  const tokenReady = tokenAddress.length === 42 && tokenAddress.startsWith("0x");

  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "symbol",
    query: { enabled: tokenReady },
  });

  const { data: tokenName } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "name",
    query: { enabled: tokenReady },
  });

  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "decimals",
    query: { enabled: tokenReady },
  });

  const { data: tokenSupply, refetch: refetchSupply } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "totalSupply",
    query: { enabled: tokenReady },
  });

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: tokenReady && Boolean(address) },
  });

  const { data: deadBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [DEAD_ADDRESS],
    query: { enabled: tokenReady },
  });

  const decimals = Number(tokenDecimals ?? 18);
  const symbol = tokenSymbol ? String(tokenSymbol) : "DAM";
  const name = tokenName ? String(tokenName) : "Damkeeper";
  const currentSupply = (tokenSupply as bigint | undefined) ?? 0n;
  const balance = (userBalance as bigint | undefined) ?? 0n;

  const parsedAmount = safeParseUnits(amount, decimals);

  const amountError =
    amount && parsedAmount === null
      ? "Enter a valid numeric amount."
      : parsedAmount !== null && parsedAmount > balance
        ? "Amount exceeds your wallet balance."
        : parsedAmount !== null && parsedAmount === 0n
          ? "Amount must be greater than zero."
          : null;

  const canBurn = Boolean(tokenReady && parsedAmount && parsedAmount > 0n && !amountError && !wrongNetwork && isConnected);

  // Calculate projected impact
  let projectedSupply = currentSupply;
  let pctReduction = "0.00";
  if (parsedAmount && currentSupply > 0n) {
    projectedSupply = currentSupply > parsedAmount ? currentSupply - parsedAmount : 0n;
    const ratio = (Number(parsedAmount) / Number(currentSupply)) * 100;
    pctReduction = ratio < 0.0001 && ratio > 0 ? "<0.0001" : ratio.toFixed(4);
  }

  const setPercent = (pct: number) => {
    if (!balance || balance === 0n) return;
    const target = (balance * BigInt(pct)) / 100n;
    setAmount(formatUnits(target, decimals));
  };

  const handleBurn = async () => {
    if (!tokenReady || !parsedAmount || parsedAmount === 0n || !address) return;

    const initialFormatted = formatTokenAmount(currentSupply, decimals);
    const newSupplyFormatted = formatTokenAmount(projectedSupply, decimals);

    let receipt: any = null;
    if (burnMode === "burn") {
      receipt = await txFlow.run({
        address: tokenAddress as `0x${string}`,
        abi: tokenAbi,
        functionName: "burn",
        args: [parsedAmount],
      });
    } else {
      receipt = await txFlow.run({
        address: tokenAddress as `0x${string}`,
        abi: tokenAbi,
        functionName: "transfer",
        args: [DEAD_ADDRESS, parsedAmount],
      });
    }

    if (!receipt || typeof receipt === "string") return;

    await Promise.all([refetchSupply(), refetchBalance()]);

    setCreatedReceipt({
      txHash: receipt.transactionHash,
      amount: formatTokenAmount(parsedAmount, decimals),
      symbol,
      initialSupply: initialFormatted,
      newSupply: newSupplyFormatted,
      pctReduction,
    });
  };

  if (createdReceipt) {
    const explorerUrl = `https://robinhoodchain.blockscout.com/tx/${createdReceipt.txHash}`;
    const tweetText = encodeURIComponent(
      `🔥 Proof of Burn on Robinhood Chain!\n\n` +
      `Just permanently destroyed ${createdReceipt.amount} $${createdReceipt.symbol} via @damkeeper_fi!\n` +
      `• Supply reduction: -${createdReceipt.pctReduction}%\n` +
      `• New Total Supply: ${createdReceipt.newSupply} $${createdReceipt.symbol}\n\n` +
      `On-Chain Proof: ${explorerUrl}\n\n` +
      `#RobinhoodChain #Damkeeper #ProofOfBurn`
    );

    return (
      <div className="burn-success-card">
        <div className="burn-flame-badge">
          <svg className="icon" aria-hidden="true" style={{ width: 28, height: 28 }}>
            <use href="#i-flame" />
          </svg>
        </div>
        <h2 style={{ fontSize: 24, margin: "10px 0 6px" }}>Tokens Successfully Burned!</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: 440, margin: "0 auto 20px" }}>
          The token destruction was mined and confirmed on Robinhood Chain Mainnet.
        </p>

        <div className="burn-receipt-box">
          <div className="burn-receipt-row">
            <span>Burned Amount</span>
            <strong style={{ color: "#ff7a45" }}>
              {createdReceipt.amount} {createdReceipt.symbol}
            </strong>
          </div>
          <div className="burn-receipt-row">
            <span>Circulating Impact</span>
            <strong style={{ color: "var(--accent)" }}>-{createdReceipt.pctReduction}% of supply</strong>
          </div>
          <div className="burn-receipt-row">
            <span>New Total Supply</span>
            <strong>
              {createdReceipt.newSupply} {createdReceipt.symbol}
            </strong>
          </div>
          <div className="burn-receipt-row">
            <span>Transaction Hash</span>
            <code className="mono" style={{ fontSize: 11, color: "var(--text-2)" }}>
              {createdReceipt.txHash.slice(0, 10)}...{createdReceipt.txHash.slice(-8)}
            </code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
          <a
            href={`https://twitter.com/intent/tweet?text=${tweetText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ background: "linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%)", borderColor: "#ff7a45" }}
          >
            <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14 }}>
              <use href="#i-x" />
            </svg>
            Share Proof on X
          </a>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            View on Blockscout <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
          </a>
          <button type="button" className="btn btn-ghost" onClick={() => { setCreatedReceipt(null); setAmount(""); }}>
            Burn more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="burn-console">
      {/* Target Token Card */}
      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor="burn-token">Token Contract</label>
          {tokenAddress !== DEFAULT_TOKEN && (
            <button type="button" className="link-btn" onClick={() => setTokenAddress(DEFAULT_TOKEN)}>
              Reset to $DAM
            </button>
          )}
        </div>
        <input
          id="burn-token"
          className="input"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value.trim())}
          placeholder="0x…"
        />
        {tokenReady && (
          <div className="tok-row" style={{ marginTop: 6 }}>
            <span className="tok-ic" style={{ background: "rgba(255, 122, 69, 0.15)", color: "#ff7a45" }}>
              <svg className="icon" aria-hidden="true" style={{ width: 12, height: 12 }}>
                <use href="#i-flame" />
              </svg>
            </span>
            <b style={{ fontSize: 13 }}>{name} ({symbol})</b>
            <span className="ok-tag" style={{ color: "#ff7a45", borderColor: "rgba(255, 122, 69, 0.3)" }}>
              {decimals} decimals · Verified
            </span>
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div className="field">
        <label className="field-label">Burn Execution Mechanism</label>
        <div className="segmented" style={{ width: "100%", marginTop: 4 }}>
          <button
            type="button"
            className="mode-btn"
            style={{ flex: 1 }}
            aria-pressed={burnMode === "burn"}
            onClick={() => setBurnMode("burn")}
          >
            🔥 Native burn() (Reduces Total Supply)
          </button>
          <button
            type="button"
            className="mode-btn"
            style={{ flex: 1 }}
            aria-pressed={burnMode === "dead"}
            onClick={() => setBurnMode("dead")}
          >
            ☠️ Send to Dead Address (0x...dEaD)
          </button>
        </div>
        <p className="field-note" style={{ marginTop: 6, fontSize: 11 }}>
          {burnMode === "burn"
            ? "Directly calls ERC20Burnable burn() to remove tokens from contract total supply onchain."
            : "Transfers tokens to unspendable dead address 0x000...dEaD, locking them out of circulation permanently."}
        </p>
      </div>

      {/* Amount Input */}
      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor="burn-amount">Amount to Burn</label>
          {isConnected && (
            <span className="field-note" style={{ color: "var(--text-2)" }}>
              Balance: <b>{formatTokenAmount(balance, decimals)} {symbol}</b>
            </span>
          )}
        </div>
        <input
          id="burn-amount"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          inputMode="decimal"
        />
        {/* Preset Percentage Selector */}
        <div className="burn-presets">
          <button type="button" className="burn-preset-btn" onClick={() => setPercent(25)}>25%</button>
          <button type="button" className="burn-preset-btn" onClick={() => setPercent(50)}>50%</button>
          <button type="button" className="burn-preset-btn" onClick={() => setPercent(75)}>75%</button>
          <button type="button" className="burn-preset-btn highlight" onClick={() => setPercent(100)}>MAX</button>
        </div>
        {amountError && <p className="field-note" style={{ color: "var(--danger)" }}>{amountError}</p>}
      </div>

      {/* Proof of Supply Impact Preview */}
      <div className="burn-impact-card">
        <div className="burn-impact-header">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#ff7a45" }}>
            <span className="dot" style={{ background: "#ff7a45", boxShadow: "0 0 8px #ff7a45" }} />
            VERIFIABLE SUPPLY IMPACT
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
            Robinhood Chain Mainnet
          </span>
        </div>
        <div className="burn-impact-grid">
          <div className="burn-impact-item">
            <span className="burn-impact-lbl">Current Total Supply</span>
            <strong className="burn-impact-val">{formatTokenAmount(currentSupply, decimals)} {symbol}</strong>
          </div>
          <div className="burn-impact-item">
            <span className="burn-impact-lbl">Supply After Burn</span>
            <strong className="burn-impact-val" style={{ color: "#ff7a45" }}>
              {formatTokenAmount(projectedSupply, decimals)} {symbol}
            </strong>
          </div>
          <div className="burn-impact-item">
            <span className="burn-impact-lbl">Reduction Impact</span>
            <strong className="burn-impact-val" style={{ color: "var(--accent)" }}>
              -{pctReduction}%
            </strong>
          </div>
        </div>
      </div>

      {/* Irreversible Warning Callout */}
      <div className="burn-warning-callout">
        <svg className="icon" aria-hidden="true" style={{ color: "#ff7a45", flex: "none", width: 16, height: 16 }}>
          <use href="#i-shield" />
        </svg>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: "var(--body)" }}>
          <strong style={{ color: "#ff7a45" }}>Permanent & Irreversible:</strong> Tokens burned cannot be recovered, recreated, or refunded by anyone.
        </p>
      </div>

      {/* Action Submit */}
      {!isConnected ? (
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", minHeight: 46 }}
          disabled={connecting}
          onClick={() => connect({ connector: connectors[0] })}
        >
          {connecting ? "Connecting Wallet…" : "Connect Wallet to Burn"}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary burn-submit-btn"
          disabled={!canBurn || txFlow.status === "awaiting_wallet" || txFlow.status === "submitted"}
          onClick={handleBurn}
        >
          <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14 }}>
            <use href="#i-flame" />
          </svg>
          {txFlow.status === "awaiting_wallet"
            ? "Confirm in Wallet…"
            : txFlow.status === "submitted"
              ? "Mining Burn on Chain…"
              : `Burn ${amount ? `${amount} ${symbol}` : "Tokens"}`}
        </button>
      )}

      {txFlow.status === "user_rejected" && (
        <p className="modal-note">Transaction rejected in wallet — no tokens were burned.</p>
      )}
      {txFlow.status === "error" && (
        <p className="modal-note" style={{ color: "var(--danger)" }}>{txFlow.errorMessage}</p>
      )}
    </div>
  );
}
