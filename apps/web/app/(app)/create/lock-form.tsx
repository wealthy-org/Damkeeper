"use client";

import { useState } from "react";
import { useAccount, useConnect, useReadContract, useSignMessage } from "wagmi";
import { erc20Abi, formatEther } from "viem";
import { lockManagerAbi } from "@/lib/abi";
import { useWrongNetwork } from "../wrong-network-banner";
import { useTxFlow, txStatusLabel } from "@/lib/use-tx-flow";
import { DateTimePicker, type DatePreset } from "../date-time-picker";
import { addDays, addMinutes, addMonths, formatLocal, formatUtc, relativeFromNow, roundUpToStep, toUnixSeconds } from "@/lib/dates";
import { formatTokenAmount, safeParseUnits } from "@/lib/amounts";
import { robinhoodMainnet, robinhoodTestnet } from "@/lib/chains";
import { cleanLabel, labelMessage, LABEL_MAX } from "@/lib/label-message";
import { positionIdFromReceipt } from "@/lib/receipt";
import { proofPath, type PositionView } from "@/lib/position-view";
import { ShareButton } from "../share/share-button";

export const LOCK_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_LOCK_MANAGER_ADDRESS ?? "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE") as `0x${string}`;

// The unlock time has to still be in the future when the create transaction is
// mined, not just when the form is filled in (brief.md 8.3).
const MIN_LEAD_MINUTES = 2;

const LOCK_PRESETS: DatePreset[] = [
  { label: "10 min", get: () => roundUpToStep(addMinutes(new Date(), 10)) },
  { label: "1 week", get: () => roundUpToStep(addDays(new Date(), 7)) },
  { label: "1 month", get: () => roundUpToStep(addMonths(new Date(), 1)) },
  { label: "3 months", get: () => roundUpToStep(addMonths(new Date(), 3)) },
  { label: "6 months", get: () => roundUpToStep(addMonths(new Date(), 6)) },
  { label: "1 year", get: () => roundUpToStep(addMonths(new Date(), 12)) },
];

const SETTLED = ["idle", "included", "user_rejected", "reverted", "error", "cancelled"];

export function LockForm({ onClose }: { onClose: () => void }) {
  const { address, isConnected, chainId: activeChainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const [token, setToken] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [unlockAt, setUnlockAt] = useState<Date | null>(null);
  const [resettingAllowance, setResettingAllowance] = useState(false);
  const [title, setTitle] = useState("");
  const [createdView, setCreatedView] = useState<PositionView | null>(null);
  const [labelNote, setLabelNote] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();

  const approveFlow = useTxFlow();
  const createFlow = useTxFlow();

  const tokenReady = token.length === 42;
  const { data: tokenSymbol } = useReadContract({ address: token as `0x${string}`, abi: erc20Abi, functionName: "symbol", query: { enabled: tokenReady } });
  const { data: tokenDecimals } = useReadContract({ address: token as `0x${string}`, abi: erc20Abi, functionName: "decimals", query: { enabled: tokenReady } });
  const { data: balance } = useReadContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: tokenReady && Boolean(address) },
  });
  const { data: contractLockFee } = useReadContract({
    address: LOCK_MANAGER_ADDRESS,
    abi: lockManagerAbi,
    functionName: "lockFee",
    query: { enabled: Boolean(LOCK_MANAGER_ADDRESS) },
  });
  const lockFee = (contractLockFee as bigint | undefined) ?? 700000000000000n;
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && LOCK_MANAGER_ADDRESS ? [address, LOCK_MANAGER_ADDRESS] : undefined,
    query: { enabled: Boolean(address && tokenReady && LOCK_MANAGER_ADDRESS) },
  });

  const wrongNetwork = useWrongNetwork();

  if (!LOCK_MANAGER_ADDRESS) {
    return (
      <p className="modal-note">
        No LockManager is configured for this deployment. Set <code className="mono">NEXT_PUBLIC_LOCK_MANAGER_ADDRESS</code> to
        enable it.
      </p>
    );
  }

  if (!isConnected) {
    return (
      <div className="empty-hero" style={{ padding: "24px 8px" }}>
        <span className="ic">
          <svg className="icon-lg" aria-hidden="true"><use href="#i-wallet" /></svg>
        </span>
        <h2>Connect a wallet</h2>
        <p>You need a wallet on Robinhood Chain to create a lock.</p>
        <button className="btn btn-primary" disabled={connecting} onClick={() => connect({ connector: connectors[0] })}>
          {connecting ? "Connecting…" : "Connect wallet"}
        </button>
      </div>
    );
  }

  const decimals = Number(tokenDecimals ?? 18);
  const symbol = tokenSymbol ? String(tokenSymbol) : "";
  const parsedAmount = safeParseUnits(amount, decimals);
  const currentAllowance = (allowance as bigint | undefined) ?? 0n;
  const isApproved = parsedAmount !== null && parsedAmount > 0n && currentAllowance >= parsedAmount;

  const minUnlock = addMinutes(new Date(), MIN_LEAD_MINUTES);
  const amountError =
    amount && parsedAmount === null
      ? "Enter a number, like 1000 or 12.5."
      : parsedAmount !== null && balance !== undefined && parsedAmount > (balance as bigint)
        ? "More than this wallet holds."
        : null;
  const unlockError =
    unlockAt && unlockAt.getTime() < minUnlock.getTime()
      ? `Pick a time at least ${MIN_LEAD_MINUTES} minutes from now, so it's still in the future when the transaction lands.`
      : null;

  const canSubmit =
    Boolean(tokenReady && beneficiary && parsedAmount && parsedAmount > 0n && unlockAt) && !amountError && !unlockError && !wrongNetwork;

  // brief.md section 10: some ERC-20s (USDT-style) reject approve() changing a
  // non-zero allowance directly, so reset a stale, insufficient allowance to zero first.
  async function handleApprove() {
    if (!LOCK_MANAGER_ADDRESS || parsedAmount === null) return;
    if (currentAllowance > 0n && currentAllowance < parsedAmount) {
      setResettingAllowance(true);
      const receipt = await approveFlow.run({ address: token as `0x${string}`, abi: erc20Abi, functionName: "approve", args: [LOCK_MANAGER_ADDRESS, 0n] });
      setResettingAllowance(false);
      if (!receipt) return;
      await refetchAllowance();
    }
    await approveFlow.run({ address: token as `0x${string}`, abi: erc20Abi, functionName: "approve", args: [LOCK_MANAGER_ADDRESS, parsedAmount] });
    await refetchAllowance();
  }

  async function handleCreate() {
    if (!LOCK_MANAGER_ADDRESS || !unlockAt || parsedAmount === null || !address) return;
    const receipt = await createFlow.run({
      address: LOCK_MANAGER_ADDRESS,
      abi: lockManagerAbi,
      functionName: "createLock",
      args: [token as `0x${string}`, beneficiary as `0x${string}`, parsedAmount, toUnixSeconds(unlockAt)],
      value: lockFee,
    });
    if (!receipt || typeof receipt === "string") return;
    const id = positionIdFromReceipt(receipt, LOCK_MANAGER_ADDRESS, lockManagerAbi, "LockCreated");
    const label = id ? await saveLabel(id) : null;
    const targetChainId = activeChainId ?? robinhoodMainnet.id;
    // On-Demand indexing: ingest immediately into database without waiting for cron
    fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chainId: targetChainId, txHash: receipt.transactionHash }),
    }).catch(() => null);
    setCreatedView({
      chainId: targetChainId,
      manager: LOCK_MANAGER_ADDRESS.toLowerCase(),
      positionId: id ?? "0",
      kind: "lock",
      token: token.toLowerCase(),
      tokenSymbol: symbol || null,
      tokenName: null,
      tokenDecimals: decimals,
      creator: address.toLowerCase(),
      beneficiary: beneficiary.toLowerCase(),
      amount: parsedAmount.toString(),
      claimedAmount: "0",
      createdAt: String(Math.floor(Date.now() / 1000)),
      unlockTime: toUnixSeconds(unlockAt).toString(),
      startTime: null,
      cliffTime: null,
      endTime: null,
      withdrawn: false,
      label,
      source: "chain",
    });
  }

  // Optional offchain label: the creator signs it so nobody else can rename the lock.
  async function saveLabel(id: string) {
    const clean = cleanLabel(title);
    if (!clean || !LOCK_MANAGER_ADDRESS) return null;
    const targetChainId = activeChainId ?? robinhoodMainnet.id;
    try {
      const message = labelMessage(targetChainId, LOCK_MANAGER_ADDRESS, id, clean);
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chainId: targetChainId, manager: LOCK_MANAGER_ADDRESS, positionId: id, label: clean, signature }),
      });
      if (!res.ok) {
        setLabelNote((await res.json().catch(() => null))?.error ?? "The title couldn't be saved.");
        return null;
      }
      return clean;
    } catch {
      setLabelNote("Title not saved — the signature was declined. The lock itself is created.");
      return null;
    }
  }

  const approveBusy = !SETTLED.includes(approveFlow.status);
  const createBusy = !SETTLED.includes(createFlow.status);
  if (createdView) {
    return (
      <div className="empty-hero" style={{ padding: "24px 8px" }}>
        <span className="ic">
          <svg className="icon-lg" aria-hidden="true"><use href="#i-check" /></svg>
        </span>
        <h2>Lock created{createdView.positionId !== "0" ? ` · #${createdView.positionId}` : ""}</h2>
        <p>
          {formatTokenAmount(BigInt(createdView.amount), decimals)} {symbol} is held until {unlockAt ? formatLocal(unlockAt) : "the unlock date"}.
          The proof page works right away; your dashboard updates once the indexer catches up.
        </p>
        {labelNote && <p className="field-note" style={{ color: "var(--danger)" }}>{labelNote}</p>}
        {createFlow.hash && <span className="mono field-note">Tx {createFlow.hash.slice(0, 10)}…{createFlow.hash.slice(-6)}</span>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {createdView.positionId !== "0" && (
            <>
              <ShareButton position={createdView} className="btn btn-primary" />
              <a href={proofPath(createdView)} className="btn btn-ghost">View proof page</a>
            </>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor="lock-title">Title (optional)</label>
          <span className="field-note">Offchain label, signed by you</span>
        </div>
        <input id="lock-title" autoFocus className="input" value={title} maxLength={LABEL_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Team tokens — 12 month lock" />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="lock-token">Token address</label>
        <input id="lock-token" className="input" value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="0x…" />
        {symbol ? (
          <div className="tok-row" style={{ marginTop: 2 }}>
            <span className="tok-ic">{symbol.slice(0, 2).toUpperCase()}</span>
            <b style={{ fontSize: 13 }}>{symbol}</b>
            <span className="ok-tag">
              <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
              ERC-20 · {decimals} decimals
            </span>
          </div>
        ) : null}
      </div>

      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor="lock-beneficiary">Withdrawal wallet</label>
          {address && beneficiary.toLowerCase() !== address.toLowerCase() && (
            <button type="button" className="link-btn" onClick={() => setBeneficiary(address)}>Use my wallet</button>
          )}
        </div>
        <input id="lock-beneficiary" className="input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value.trim())} placeholder="0x…" />
      </div>

      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor="lock-amount">Amount</label>
          {balance !== undefined && (
            <button type="button" className="link-btn" onClick={() => setAmount(formatTokenAmount(balance as bigint, decimals, 18).replace(/,/g, ""))}>
              Balance {formatTokenAmount(balance as bigint, decimals)} {symbol}
            </button>
          )}
        </div>
        <input id="lock-amount" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" inputMode="decimal" />
        {amountError && <p className="field-note" style={{ color: "var(--danger)" }}>{amountError}</p>}
      </div>

      <DateTimePicker
        id="lock-unlock"
        label="Unlock date"
        value={unlockAt}
        onChange={setUnlockAt}
        min={minUnlock}
        presets={LOCK_PRESETS}
        placeholder="Pick an unlock date"
        error={unlockError}
      />

      <dl className="review">
        <div>
          <dt>You approve</dt>
          <dd className="mono">{parsedAmount ? formatTokenAmount(parsedAmount, decimals) : "0"} {symbol}</dd>
        </div>
        <div>
          <dt>Withdrawable by</dt>
          <dd className="mono">{beneficiary ? `${beneficiary.slice(0, 6)}…${beneficiary.slice(-4)}` : "—"}</dd>
        </div>
        <div>
          <dt>Withdrawable from</dt>
          <dd>{unlockAt ? `${formatUtc(unlockAt)} · ${relativeFromNow(unlockAt)}` : "—"}</dd>
        </div>
        <div>
          <dt>Platform fee</dt>
          <dd>{lockFee > 0n ? `${formatEther(lockFee)} ETH (~$2.00)` : "None · gas only"}</dd>
        </div>
      </dl>

      {isApproved ? (
        <button className="btn btn-primary btn-block" disabled={!canSubmit || createBusy} onClick={handleCreate}>
          {createBusy ? txStatusLabel(createFlow.status) : "Create lock"}
        </button>
      ) : (
        <button className="btn btn-primary btn-block" disabled={!canSubmit || approveBusy} onClick={handleApprove}>
          {approveBusy ? (resettingAllowance ? "Resetting old allowance…" : txStatusLabel(approveFlow.status)) : "Approve exact amount"}
        </button>
      )}

      <div className="steps-mini">
        <span className={isApproved ? "on" : undefined}>1 · Approve</span>
        <span className="bar" />
        <span>2 · Create lock</span>
      </div>

      {createFlow.status === "user_rejected" && <p className="modal-note">Signature rejected — nothing was sent.</p>}
      {createFlow.status === "reverted" && <p className="modal-note" style={{ color: "var(--danger)" }}>Reverted onchain — no lock was created.</p>}
      {createFlow.status === "error" && <p className="modal-note" style={{ color: "var(--danger)" }}>{createFlow.errorMessage}</p>}
    </div>
  );
}
