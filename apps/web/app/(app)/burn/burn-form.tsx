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

  const isAddressFormat = /^0x[a-fA-F0-9]{40}$/.test(tokenAddress.trim());
  const tokenReady = isAddressFormat;
  const isDam = tokenAddress.toLowerCase() === DEFAULT_TOKEN.toLowerCase();

  // Auto-detect whether bytecode contains burn(uint256) selector 0x42966c68
  useEffect(() => {
    if (!publicClient || !tokenReady) {
      setSupportsNativeBurn(null);
      return;
    }
    publicClient
      .getBytecode({ address: tokenAddress.trim() as `0x${string}` })
      .then((code) => {
        if (!code || code === "0x") {
          setSupportsNativeBurn(null);
          return;
        }
        if (code.toLowerCase().includes("42966c68")) {
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

  const { data: tokenSymbol, isLoading: loadingSymbol, isError: errorSymbol } = useReadContract({
    address: tokenAddress.trim() as `0x${string}`,
    abi: tokenAbi,
    functionName: "symbol",
    query: { enabled: tokenReady },
  });

  const { data: tokenName, isLoading: loadingName } = useReadContract({
    address: tokenAddress.trim() as `0x${string}`,
    abi: tokenAbi,
    functionName: "name",
    query: { enabled: tokenReady },
  });

  const { data: tokenDecimals, isLoading: loadingDecimals } = useReadContract({
    address: tokenAddress.trim() as `0x${string}`,
    abi: tokenAbi,
    functionName: "decimals",
    query: { enabled: tokenReady },
  });

  const { data: tokenSupply, isLoading: loadingSupply, refetch: refetchSupply, isError: errorSupply } = useReadContract({
    address: tokenAddress.trim() as `0x${string}`,
    abi: tokenAbi,
    functionName: "totalSupply",
    query: { enabled: tokenReady },
  });

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress.trim() as `0x${string}`,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: tokenReady && Boolean(address) },
  });

  const { data: deadBalance } = useReadContract({
    address: tokenAddress.trim() as `0x${string}`,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [DEAD_ADDRESS],
    query: { enabled: tokenReady },
  });

  const isLoadingToken = tokenReady && !isDam && (loadingSymbol || loadingName || loadingDecimals || loadingSupply);
  const isTokenError = tokenReady && !isDam && !isLoadingToken && (errorSymbol || errorSupply || !tokenSymbol || tokenSupply === undefined);

  const decimals = Number(tokenDecimals ?? 18);
  const symbol = isDam ? (tokenSymbol ? String(tokenSymbol) : "DAM") : (tokenSymbol ? String(tokenSymbol) : "");
  const name = isDam ? (tokenName ? String(tokenName) : "Damkeeper") : (tokenName ? String(tokenName) : symbol);
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

  const canBurn = Boolean(
    tokenReady &&
    !isTokenError &&
    !isLoadingToken &&
    (isDam || Boolean(tokenSymbol)) &&
    parsedAmount &&
    parsedAmount > 0n &&
    !amountError &&
    !wrongNetwork &&
    isConnected
  );

  const currentDead = (deadBalance as bigint | undefined) ?? 0n;

  // High-precision BigInt supply contraction calculation (scaled to 6 decimal places: 100 * 1,000,000)
  let projectedSupply = currentSupply;
  let projectedDead = currentDead;
  let pctReduction = "0.00";
  let isTinyReduction = false;

  if (parsedAmount && currentSupply > 0n) {
    const scale = 1_000_000n;
    const numerator = parsedAmount * 100n * scale;
    const scaledVal = numerator / currentSupply;

    if (scaledVal === 0n && parsedAmount > 0n) {
      isTinyReduction = true;
      pctReduction = "<0.000001";
    } else {
      const whole = scaledVal / scale;
      const frac = (scaledVal % scale).toString().padStart(6, "0");
      const trimmedFrac = frac.replace(/0+$/, "");
      if (!trimmedFrac) {
        pctReduction = `${whole}.00`;
      } else if (trimmedFrac.length === 1) {
        pctReduction = `${whole}.${trimmedFrac}0`;
      } else {
        pctReduction = `${whole}.${trimmedFrac}`;
      }
    }

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

    // On-demand indexing so the burn shows up in Explore right away.
    fetch("/api/burns/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chainId: robinhoodMainnet.id, txHash: receipt.transactionHash }),
    }).catch(() => null);

    const details: BurnSuccessDetails = {
      txHash: receipt.transactionHash,
      amount: formatTokenAmount(parsedAmount, decimals),
      symbol: symbol || "Tokens",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Recent Burn banner if any */}
      {successDetails && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(184, 243, 107, 0.06)", border: "1px solid rgba(184, 243, 107, 0.25)", borderRadius: 8, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14, color: "var(--accent)", flex: "none" }}>
              <use href="#i-flame" />
            </svg>
            <span style={{ fontSize: 12 }}>
              Last Burn: <strong style={{ color: "var(--accent)" }}>{successDetails.amount} {successDetails.symbol}</strong> ({successDetails.pctReduction.startsWith("<") ? "< -0.000001%" : `-${successDetails.pctReduction}%`})
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

      {/* Target Token Field */}
      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor="burn-token">Token address</label>
          {!isDam ? (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setTokenAddress(DEFAULT_TOKEN);
                setCustomTokenOpen(false);
              }}
            >
              Reset to $DAM
            </button>
          ) : (
            <button
              type="button"
              className="link-btn"
              onClick={() => setCustomTokenOpen(!customTokenOpen)}
            >
              {customTokenOpen ? "Hide manual input" : "Manual address"}
            </button>
          )}
        </div>
        {customTokenOpen && (
          <input
            id="burn-token"
            className="input"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value.trim())}
            placeholder="Paste ERC-20 contract address (0x…)"
            autoFocus
          />
        )}

        {customTokenOpen && tokenAddress.length > 0 && !isAddressFormat && (
          <p className="field-note" style={{ color: "var(--danger)", marginTop: 4 }}>
            Please enter a valid 42-character hex address starting with 0x.
          </p>
        )}

        {tokenReady && isLoadingToken && (
          <div className="tok-row" style={{ marginTop: 6, opacity: 0.8 }}>
            <span className="tok-ic" style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--muted)", fontSize: 12 }}>
              …
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Reading token metadata on Robinhood Chain…
            </span>
          </div>
        )}

        {tokenReady && isTokenError && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255, 92, 92, 0.08)", border: "1px solid rgba(255, 92, 92, 0.25)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14, color: "var(--danger)", flex: "none" }}>
              <use href="#i-alert" />
            </svg>
            <span style={{ fontSize: 12, color: "var(--danger)" }}>
              No ERC-20 contract detected at this address on Robinhood Chain. Verify the contract address.
            </span>
          </div>
        )}

        {tokenReady && !isTokenError && !isLoadingToken && (
          <div className="tok-row" style={{ marginTop: 4 }}>
            <span className="tok-ic">
              {isDam ? (
                <img
                  src="/logo-symbol.png"
                  alt="DAM"
                  width={30}
                  height={30}
                />
              ) : (
                <span style={{ fontWeight: 700, fontSize: 11, color: "var(--accent)" }}>
                  {symbol ? symbol.slice(0, 3).toUpperCase() : "??"}
                </span>
              )}
            </span>
            <b style={{ fontSize: 13 }}>{name} {symbol ? `(${symbol})` : ""}</b>
            <span className="ok-tag">
              <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
              ERC-20 · {decimals} decimals{isDam ? " · Verified" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Burn Execution Mechanism */}
      <div className="field">
        <div className="field-row">
          <label className="field-label">Execution mechanism</label>
          {supportsNativeBurn !== null && (
            <span className="field-note" style={{ color: supportsNativeBurn ? "var(--accent)" : "var(--muted)" }}>
              {supportsNativeBurn ? "ERC20Burnable supported" : "Standard ERC-20 (Dead sink)"}
            </span>
          )}
        </div>
        <div className="burn-mech-control">
          <button
            type="button"
            className="burn-mech-btn"
            aria-pressed={burnMode === "burn"}
            disabled={supportsNativeBurn === false}
            title={supportsNativeBurn === false ? "Contract does not implement burn(uint256)" : "Burn tokens and reduce total supply"}
            onClick={() => setBurnMode("burn")}
          >
            <span className="burn-mech-radio">
              {burnMode === "burn" && <span className="burn-mech-radio-dot" />}
            </span>
            <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14 }}>
              <use href="#i-flame" />
            </svg>
            <span>Native burn()</span>
          </button>
          <button
            type="button"
            className="burn-mech-btn"
            aria-pressed={burnMode === "dead"}
            title="Transfer tokens to dead address"
            onClick={() => setBurnMode("dead")}
          >
            <span className="burn-mech-radio">
              {burnMode === "dead" && <span className="burn-mech-radio-dot" />}
            </span>
            <svg className="icon" aria-hidden="true" style={{ width: 14, height: 14 }}>
              <use href="#i-dead" />
            </svg>
            <span>Dead Sink (0x...dEaD)</span>
          </button>
        </div>
        <p className="field-note" style={{ margin: "2px 0 0" }}>
          {burnMode === "burn"
            ? "Directly calls ERC20Burnable burn() to destroy tokens and reduce onchain totalSupply."
            : "Transfers tokens to unspendable dead address 0x000...dEaD. Supply stays constant, circulating supply decreases."}
        </p>
      </div>

      {/* Amount Field */}
      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor="burn-amount">Amount to burn</label>
          {isConnected && balance !== undefined && (
            <button
              type="button"
              className="link-btn"
              onClick={() => setPercent(100)}
            >
              Balance {formatTokenAmount(balance, decimals)} {symbol || "Tokens"}
            </button>
          )}
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input
            id="burn-amount"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            inputMode="decimal"
            style={{ paddingRight: 80, fontSize: 15, fontFamily: "var(--mono)" }}
          />
          <div style={{ position: "absolute", right: 12, display: "flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
            {isDam && (
              <img
                src="/logo-symbol.png"
                alt=""
                width={16}
                height={16}
                style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", fontFamily: "var(--mono)" }}>{symbol || "Tokens"}</span>
          </div>
        </div>
        <div className="burn-presets-row">
          <button type="button" className="burn-preset-chip" onClick={() => setPercent(25)}>25%</button>
          <button type="button" className="burn-preset-chip" onClick={() => setPercent(50)}>50%</button>
          <button type="button" className="burn-preset-chip" onClick={() => setPercent(75)}>75%</button>
          <button type="button" className="burn-preset-chip" onClick={() => setPercent(100)}>MAX</button>
        </div>
        {amountError && <p className="field-note" style={{ color: "var(--danger)" }}>{amountError}</p>}
      </div>

      {/* Review Section */}
      <dl className="review">
        <div>
          <dt>Contract Total Supply</dt>
          <dd className="mono">{formatTokenAmount(currentSupply, decimals)} {symbol || "Tokens"}</dd>
        </div>
        <div>
          <dt>{burnMode === "burn" ? "Supply After Burn" : "Tokens in Dead Sink"}</dt>
          <dd className="mono" style={{ color: "var(--text)" }}>
            {burnMode === "burn"
              ? `${formatTokenAmount(projectedSupply, decimals)} ${symbol || "Tokens"}`
              : `${formatTokenAmount(projectedDead, decimals)} ${symbol || "Tokens"}`}
          </dd>
        </div>
        <div>
          <dt>Total Supply Contraction <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>(of total supply)</span></dt>
          <dd className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>
            {isTinyReduction ? "< -0.000001%" : `-${pctReduction}%`}
            {parsedAmount && parsedAmount > 0n && (
              <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85, marginLeft: 6, color: "var(--muted)" }}>
                (-{formatTokenAmount(parsedAmount, decimals)} {symbol || "Tokens"})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>Robinhood Chain (4663)</dd>
        </div>
      </dl>

      {/* Permanent Warning */}
      <div className="burn-callout">
        <svg className="icon" aria-hidden="true">
          <use href="#i-shield" />
        </svg>
        <div>
          <strong style={{ color: "var(--danger)" }}>Permanent & Irreversible:</strong> Tokens burned cannot be recovered, recreated, or refunded by anyone.
        </div>
      </div>

      {/* Submit Button */}
      {!isConnected ? (
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={connecting}
          onClick={() => connect({ connector: connectors[0] })}
        >
          {connecting ? "Connecting Wallet…" : "Connect wallet to burn"}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-block"
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
              : `Burn ${parsedAmount && parsedAmount > 0n ? `${formatTokenAmount(parsedAmount, decimals)} ${symbol || "Tokens"}` : symbol || "Tokens"}`}
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
