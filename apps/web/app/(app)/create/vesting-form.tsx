"use client";

import { useState } from "react";
import { useAccount, useConnect, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { vestingManagerAbi } from "@/lib/abi";
import { vestedAmount } from "@damkeeper/domain/vesting";
import { useWrongNetwork } from "../wrong-network-banner";
import { useTxFlow, txStatusLabel } from "@/lib/use-tx-flow";
import { DateTimePicker, type DatePreset } from "../date-time-picker";
import { addDays, addMinutes, addMonths, formatLocal, formatShort, roundUpToStep, toUnixSeconds } from "@/lib/dates";
import { formatTokenAmount, safeParseUnits } from "@/lib/amounts";

export const VESTING_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_VESTING_MANAGER_ADDRESS as `0x${string}` | undefined;

// An explicit start must still be in the future when the create transaction is
// mined (brief.md 8.4), so leave room for approval and inclusion.
const MIN_LEAD_MINUTES = 2;
const SETTLED = ["idle", "included", "user_rejected", "reverted", "error", "cancelled"];

export function VestingForm({ onClose }: { onClose: () => void }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const [token, setToken] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [start, setStart] = useState<Date | null>(null);
  const [cliff, setCliff] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [resettingAllowance, setResettingAllowance] = useState(false);

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
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && VESTING_MANAGER_ADDRESS ? [address, VESTING_MANAGER_ADDRESS] : undefined,
    query: { enabled: Boolean(address && tokenReady && VESTING_MANAGER_ADDRESS) },
  });

  const wrongNetwork = useWrongNetwork();

  if (!VESTING_MANAGER_ADDRESS) {
    return (
      <p className="modal-note">
        No VestingManager is configured for this deployment. Set <code className="mono">NEXT_PUBLIC_VESTING_MANAGER_ADDRESS</code> to
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
        <p>You need a wallet on Robinhood Chain Testnet to create a vesting schedule.</p>
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

  const now = new Date();
  const minStart = addMinutes(now, MIN_LEAD_MINUTES);
  // "When confirmed" resolves to the create transaction's block time (brief.md 8.4);
  // `now` is only an estimate for the preview and validation.
  const effectiveStart = start ?? now;
  const base = () => start ?? roundUpToStep(new Date());

  const startPresets: DatePreset[] = [
    { label: "When confirmed", get: () => null },
    { label: "Tomorrow", get: () => roundUpToStep(addDays(new Date(), 1)) },
    { label: "Next week", get: () => roundUpToStep(addDays(new Date(), 7)) },
    { label: "Next month", get: () => roundUpToStep(addMonths(new Date(), 1)) },
  ];
  const cliffPresets: DatePreset[] = [
    { label: "No cliff", get: () => null },
    { label: "+1 month", get: () => addMonths(base(), 1) },
    { label: "+3 months", get: () => addMonths(base(), 3) },
    { label: "+6 months", get: () => addMonths(base(), 6) },
    { label: "+1 year", get: () => addMonths(base(), 12) },
  ];
  const endPresets: DatePreset[] = [
    { label: "+6 months", get: () => addMonths(base(), 6) },
    { label: "+1 year", get: () => addMonths(base(), 12) },
    { label: "+2 years", get: () => addMonths(base(), 24) },
    { label: "+4 years", get: () => addMonths(base(), 48) },
  ];

  const amountError =
    amount && parsedAmount === null
      ? "Enter a number, like 1000 or 12.5."
      : parsedAmount !== null && balance !== undefined && parsedAmount > (balance as bigint)
        ? "More than this wallet holds."
        : null;
  const startError =
    start && start.getTime() < minStart.getTime()
      ? `Pick a start at least ${MIN_LEAD_MINUTES} minutes from now, or choose "When confirmed".`
      : null;
  const endError = end && end.getTime() <= effectiveStart.getTime() ? "The end has to be after the start." : null;
  const cliffError =
    cliff && (cliff.getTime() <= effectiveStart.getTime() || (end !== null && cliff.getTime() >= end.getTime()))
      ? "The cliff has to fall between the start and the end."
      : null;

  const canSubmit =
    Boolean(tokenReady && beneficiary && parsedAmount && parsedAmount > 0n && end) &&
    !amountError && !startError && !endError && !cliffError && !wrongNetwork;

  const preview = parsedAmount && end && !endError && !cliffError ? buildPreview(parsedAmount, effectiveStart, cliff, end) : null;

  async function handleApprove() {
    if (!VESTING_MANAGER_ADDRESS || parsedAmount === null) return;
    if (currentAllowance > 0n && currentAllowance < parsedAmount) {
      setResettingAllowance(true);
      const receipt = await approveFlow.run({ address: token as `0x${string}`, abi: erc20Abi, functionName: "approve", args: [VESTING_MANAGER_ADDRESS, 0n] });
      setResettingAllowance(false);
      if (!receipt) return;
      await refetchAllowance();
    }
    await approveFlow.run({ address: token as `0x${string}`, abi: erc20Abi, functionName: "approve", args: [VESTING_MANAGER_ADDRESS, parsedAmount] });
    await refetchAllowance();
  }

  async function handleCreate() {
    if (!VESTING_MANAGER_ADDRESS || !end || parsedAmount === null) return;
    await createFlow.run({
      address: VESTING_MANAGER_ADDRESS,
      abi: vestingManagerAbi,
      functionName: "createVesting",
      args: [
        token as `0x${string}`,
        beneficiary as `0x${string}`,
        parsedAmount,
        start ? toUnixSeconds(start) : 0n,
        cliff ? toUnixSeconds(cliff) : 0n,
        toUnixSeconds(end),
      ],
    });
  }

  const approveBusy = !SETTLED.includes(approveFlow.status);
  const createBusy = !SETTLED.includes(createFlow.status);

  if (createFlow.status === "included") {
    return (
      <div className="empty-hero" style={{ padding: "24px 8px" }}>
        <span className="ic">
          <svg className="icon-lg" aria-hidden="true"><use href="#i-check" /></svg>
        </span>
        <h2>Vesting schedule created</h2>
        <p>
          {parsedAmount ? formatTokenAmount(parsedAmount, decimals) : ""} {symbol} releases until{" "}
          {end ? formatLocal(end) : "the end date"}. It shows on your dashboard once the indexer catches up.
        </p>
        {createFlow.hash && <span className="mono field-note">Tx {createFlow.hash.slice(0, 10)}…{createFlow.hash.slice(-6)}</span>}
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="field">
        <label className="field-label" htmlFor="v-token">Token address</label>
        <input id="v-token" autoFocus className="input" value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="0x…" />
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
          <label className="field-label" htmlFor="v-beneficiary">Beneficiary</label>
          {address && beneficiary.toLowerCase() !== address.toLowerCase() && (
            <button type="button" className="link-btn" onClick={() => setBeneficiary(address)}>Use my wallet</button>
          )}
        </div>
        <input id="v-beneficiary" className="input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value.trim())} placeholder="0x…" />
      </div>

      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor="v-amount">Amount</label>
          {balance !== undefined && (
            <button type="button" className="link-btn" onClick={() => setAmount(formatTokenAmount(balance as bigint, decimals, 18).replace(/,/g, ""))}>
              Balance {formatTokenAmount(balance as bigint, decimals)} {symbol}
            </button>
          )}
        </div>
        <input id="v-amount" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" inputMode="decimal" />
        {amountError && <p className="field-note" style={{ color: "var(--danger)" }}>{amountError}</p>}
      </div>

      <DateTimePicker id="v-start" label="Start" value={start} onChange={setStart} min={minStart} presets={startPresets} emptyLabel="When the transaction confirms" error={startError} />
      <DateTimePicker id="v-cliff" label="Cliff (optional)" value={cliff} onChange={setCliff} min={start ?? minStart} presets={cliffPresets} emptyLabel="No cliff" error={cliffError} />
      <DateTimePicker id="v-end" label="End" value={end} onChange={setEnd} min={cliff ?? start ?? minStart} presets={endPresets} placeholder="Pick when everything has vested" error={endError} />

      {preview && parsedAmount && end && (
        <div className="review">
          <div style={{ display: "block" }}>
            <div className="v-track" aria-hidden="true">
              <i style={{ width: `${preview.cliffPct}%` }} />
            </div>
            <div className="v-marks">
              <span>{start ? formatShort(start) : "On confirmation"}</span>
              <span>{formatShort(end)}</span>
            </div>
          </div>
          <div className="v-points">
            {preview.points.map((p) => (
              <div key={p.label}>
                <span>{p.label}</span>
                <b>{formatTokenAmount(p.vested, decimals)}</b>
                <small>{p.share}</small>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, lineHeight: 1.7, color: "var(--body)" }}>
            {cliff
              ? `Nothing can be claimed until ${formatLocal(cliff)}. At that moment ${formatTokenAmount(preview.atCliff, decimals)} ${symbol} — everything vested since the start — becomes claimable at once. After that, tokens keep releasing every second until ${formatLocal(end)}.`
              : `Tokens release every second from the start and are fully claimable from ${formatLocal(end)}.`}
            {!start && " The start is set by the block that confirms the transaction, so these figures are an estimate."}
          </p>
        </div>
      )}

      <dl className="review">
        <div>
          <dt>You approve</dt>
          <dd className="mono">{parsedAmount ? formatTokenAmount(parsedAmount, decimals) : "0"} {symbol}</dd>
        </div>
        <div>
          <dt>Claimable by</dt>
          <dd className="mono">{beneficiary ? `${beneficiary.slice(0, 6)}…${beneficiary.slice(-4)}` : "—"}</dd>
        </div>
        <div>
          <dt>Platform fee</dt>
          <dd>None · gas only</dd>
        </div>
      </dl>

      {isApproved ? (
        <button className="btn btn-primary btn-block" disabled={!canSubmit || createBusy} onClick={handleCreate}>
          {createBusy ? txStatusLabel(createFlow.status) : "Create vesting"}
        </button>
      ) : (
        <button className="btn btn-primary btn-block" disabled={!canSubmit || approveBusy} onClick={handleApprove}>
          {approveBusy ? (resettingAllowance ? "Resetting old allowance…" : txStatusLabel(approveFlow.status)) : "Approve exact amount"}
        </button>
      )}

      <div className="steps-mini">
        <span className={isApproved ? "on" : undefined}>1 · Approve</span>
        <span className="bar" />
        <span>2 · Create vesting</span>
      </div>

      {createFlow.status === "user_rejected" && <p className="modal-note">Signature rejected — nothing was sent.</p>}
      {createFlow.status === "reverted" && <p className="modal-note" style={{ color: "var(--danger)" }}>Reverted onchain — no schedule was created.</p>}
      {createFlow.status === "error" && <p className="modal-note" style={{ color: "var(--danger)" }}>{createFlow.errorMessage}</p>}
    </div>
  );
}

// brief.md section 10: preview what's available at start, cliff, midpoint and end,
// using the same formula the contract uses (packages/domain).
function buildPreview(total: bigint, start: Date, cliff: Date | null, end: Date) {
  const s = toUnixSeconds(start);
  const c = cliff ? toUnixSeconds(cliff) : 0n;
  const e = toUnixSeconds(end);
  const terms = { totalAmount: total, startTime: s, cliffTime: c, endTime: e, claimedAmount: 0n };
  const at = (t: bigint) => vestedAmount(terms, t);
  const mid = s + (e - s) / 2n;

  const points = [
    { label: "Start", vested: at(s), share: "0%" },
    ...(cliff ? [{ label: "Cliff", vested: at(c), share: pct(at(c), total) }] : []),
    { label: "Midpoint", vested: at(mid), share: pct(at(mid), total) },
    { label: "End", vested: at(e), share: "100%" },
  ];

  const span = Number(e - s);
  const cliffPct = cliff && span > 0 ? Math.min(100, Math.max(0, (Number(c - s) / span) * 100)) : 0;
  return { points, atCliff: cliff ? at(c) : 0n, cliffPct };
}

function pct(part: bigint, total: bigint) {
  if (total === 0n) return "0%";
  const bps = (part * 10000n) / total;
  return `${(Number(bps) / 100).toFixed(bps % 100n === 0n ? 0 : 1)}%`;
}
