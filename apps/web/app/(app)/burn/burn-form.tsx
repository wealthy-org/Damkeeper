"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useReadContract, usePublicClient } from "wagmi";
import { formatUnits, parseAbi } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import { formatTokenAmount, safeParseUnits } from "@/lib/amounts";
import { useTxFlow } from "@/lib/use-tx-flow";
import { useWrongNetwork } from "../wrong-network-banner";
import { BurnSuccessModal, type BurnSuccessDetails } from "./burn-success-modal";

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
  const [supportsNativeBurn, setSupportsNativeBurn] = useState<boolean | null>(null);
  const [successDetails, setSuccessDetails] = useState<BurnSuccessDetails | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [customTokenOpen, setCustomTokenOpen] = useState<boolean>(false);

  const txFlow = useTxFlow();

  const tokenReady = tokenAddress.length === 42 && tokenAddress.startsWith("0x");

  // Auto-detect whether bytecode contains burn(uint256) selector 0x42966c68
  useEffect(() => {
    if (!publicClient || !tokenReady) return;
    publicClient
      .getBytecode({ address: tokenAddress as `0x${string}` })
      .then((code) => {
        if (code && code.toLowerCase().includes("42966c68")) {
          setSupportsNativeBurn(true);
          setBurnMode("burn");
        } else {
          setSupportsNativeBurn(false);
          setBurnMode("dead");
        }
      })
      .catch(() => {
        setSupportsNativeBurn(null);
      });
  }, [tokenAddress, tokenReady, publicClient]);

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

  const currentDead = (deadBalance as bigint | undefined) ?? 0n;

  // Calculate projected impact based on selected mode
  let projectedSupply = currentSupply;
  let projectedDead = currentDead;
  let pctReduction = "0.00";
  if (parsedAmount && currentSupply > 0n) {
    const ratio = (Number(parsedAmount) / Number(currentSupply)) * 100;
    pctReduction = ratio < 0.0001 && ratio > 0 ? "<0.0001" : ratio.toFixed(4);

    if (burnMode === "burn") {
      projectedSupply = currentSupply > parsedAmount ? currentSupply - parsedAmount : 0n;
    } else {
      projectedDead = currentDead + parsedAmount;
    }
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

    const details: BurnSuccessDetails = {
      txHash: receipt.transactionHash,
      amount: formatTokenAmount(parsedAmount, decimals),
      symbol,
      tokenAddress,
      burnMode,
      initialSupply: initialFormatted,
      newSupply: newSupplyFormatted,
      pctReduction,
      chainId: robinhoodMainnet.id,
    };

    setSuccessDetails(details);
    setShowSuccessModal(true);
    setAmount("");
  };

  return (
    <div className="burn-console">
      {/* Recent Burn Banner if any */}
      {successDetails && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255, 122, 69, 0.08)", border: "1px solid rgba(255, 122, 69, 0.28)", borderRadius: "8px", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14, color: "#ff7a45", flex: "none" }}>
              <use href="#i-flame" />
            </svg>
            <span style={{ fontSize: 12 }}>
              Last Burn: <strong style={{ color: "#ff7a45" }}>{successDetails.amount} {successDetails.symbol}</strong> (-{successDetails.pctReduction}%)
            </span>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "2px 10px", minHeight: 28 }}
            onClick={() => setShowSuccessModal(true)}
          >
            View Proof Modal
          </button>
        </div>
      )}

      {/* Token Selector Row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 600 }}>
              Target Asset
            </span>
            {tokenReady && (
              <span className="ok-tag" style={{ color: "#ff7a45", borderColor: "rgba(255, 122, 69, 0.3)", padding: "2px 8px", fontSize: 11 }}>
                {name} ({symbol}) · Verified
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {tokenAddress !== DEFAULT_TOKEN && (
              <button
                type="button"
                className="link-btn"
                style={{ fontSize: 11 }}
                onClick={() => {
                  setTokenAddress(DEFAULT_TOKEN);
                  setCustomTokenOpen(false);
                }}
              >
                Reset to $DAM
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: "2px 10px", minHeight: 28 }}
              onClick={() => setCustomTokenOpen(!customTokenOpen)}
            >
              {customTokenOpen ? "Hide Contract" : "Custom ERC-20 ▾"}
            </button>
          </div>
        </div>

        {customTokenOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "rgba(0,0,0,0.3)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hair-2)" }}>
            <label className="field-label" htmlFor="burn-token" style={{ fontSize: 11 }}>Contract Address</label>
            <input
              id="burn-token"
              className="input"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value.trim())}
              placeholder="0x…"
              style={{ fontSize: 12, height: 36 }}
            />
          </div>
        )}
      </div>

      {/* Recessed Swap-Style Amount Box */}
      <div className="burn-asset-box">
        <div className="burn-asset-top">
          <span className="burn-asset-label">Amount to Burn</span>
          {isConnected && (
            <span className="burn-asset-bal">
              Balance: <b>{formatTokenAmount(balance, decimals)} {symbol}</b>
              <button
                type="button"
                className="burn-max-pill"
                onClick={() => setPercent(100)}
                title="Use full balance"
              >
                MAX
              </button>
            </span>
          )}
        </div>

        <div className="burn-asset-main">
          <input
            id="burn-amount"
            className="burn-amount-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            inputMode="decimal"
            autoComplete="off"
          />
          <div className="burn-token-badge">
            <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14, color: "#ff7a45" }}>
              <use href="#i-flame" />
            </svg>
            <span>{symbol || "DAM"}</span>
          </div>
        </div>

        <div className="burn-asset-bottom">
          <div className="burn-quick-presets">
            <button type="button" className="burn-chip-btn" onClick={() => setPercent(25)}>25%</button>
            <button type="button" className="burn-chip-btn" onClick={() => setPercent(50)}>50%</button>
            <button type="button" className="burn-chip-btn" onClick={() => setPercent(75)}>75%</button>
            <button type="button" className="burn-chip-btn" onClick={() => setPercent(100)}>100%</button>
          </div>
          {amountError && (
            <span style={{ fontSize: 11, color: "var(--danger)", fontWeight: 500 }}>
              {amountError}
            </span>
          )}
        </div>
      </div>

      {/* Burn Execution Mechanism Tabs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 600 }}>
            Execution Mechanism
          </span>
          {supportsNativeBurn !== null && (
            <span style={{ fontSize: 11, color: supportsNativeBurn ? "var(--accent)" : "var(--muted)" }}>
              {supportsNativeBurn ? "✓ ERC20Burnable supported" : "Standard ERC-20 (Dead sink only)"}
            </span>
          )}
        </div>
        <div className="burn-mode-tabs">
          <button
            type="button"
            className="burn-mode-tab"
            aria-pressed={burnMode === "burn"}
            disabled={supportsNativeBurn === false}
            title={supportsNativeBurn === false ? "Contract does not implement burn(uint256)" : ""}
            onClick={() => setBurnMode("burn")}
          >
            <span className="burn-mode-tab-title">
              <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14, color: burnMode === "burn" ? "#ff7a45" : "inherit" }}>
                <use href="#i-flame" />
              </svg>
              Native burn()
            </span>
            <span className="burn-mode-tab-sub">Reduces Total Supply</span>
          </button>
          <button
            type="button"
            className="burn-mode-tab"
            aria-pressed={burnMode === "dead"}
            onClick={() => setBurnMode("dead")}
          >
            <span className="burn-mode-tab-title">
              <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14, color: burnMode === "dead" ? "#ff7a45" : "inherit" }}>
                <use href="#i-dead" />
              </svg>
              Dead Address Sink
            </span>
            <span className="burn-mode-tab-sub">0x000...dEaD transfer</span>
          </button>
        </div>
      </div>

      {/* Verifiable Supply Impact Telemetry Box */}
      <div className="burn-telemetry-box">
        <div className="burn-telemetry-head">
          <span className="burn-telemetry-tag">
            <span className="dot" style={{ background: "#ff7a45", boxShadow: "0 0 8px #ff7a45" }} />
            Verifiable Supply Impact
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
            Robinhood Chain
          </span>
        </div>

        <div className="burn-telemetry-grid">
          <div className="burn-telemetry-cell">
            <span className="burn-telemetry-lbl">Contract Supply</span>
            <strong className="burn-telemetry-val">
              {formatTokenAmount(currentSupply, decimals)}
            </strong>
          </div>
          <div className="burn-telemetry-cell">
            <span className="burn-telemetry-lbl">
              {burnMode === "burn" ? "After Burn" : "Dead Sink"}
            </span>
            <strong className="burn-telemetry-val" style={{ color: "#ff7a45" }}>
              {burnMode === "burn"
                ? formatTokenAmount(projectedSupply, decimals)
                : formatTokenAmount(projectedDead, decimals)}
            </strong>
          </div>
          <div className="burn-telemetry-cell">
            <span className="burn-telemetry-lbl">Contraction</span>
            <strong className="burn-telemetry-val" style={{ color: "var(--accent)" }}>
              -{pctReduction}%
            </strong>
          </div>
        </div>

        <div className="burn-telemetry-note">
          <svg className="icon" aria-hidden="true" style={{ width: 13, height: 13, color: burnMode === "burn" ? "#ff7a45" : "var(--muted)", flex: "none" }}>
            <use href={burnMode === "burn" ? "#i-flame" : "#i-dead"} />
          </svg>
          <span>
            {burnMode === "burn"
              ? `Contract totalSupply will decrease on-chain by ${amount ? `${amount} ${symbol}` : "the burned amount"}.`
              : `Tokens sent to 0x...dEaD. Total supply stays constant; circulating supply decreases.`}
          </span>
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

      {/* Burn Success Modal dialog */}
      <BurnSuccessModal
        open={showSuccessModal}
        details={successDetails}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
}
