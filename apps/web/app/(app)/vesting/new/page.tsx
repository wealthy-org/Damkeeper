"use client";

import { useState } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { erc20Abi, parseUnits } from "viem";
import { vestingManagerAbi } from "@/lib/abi";

const VESTING_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_VESTING_MANAGER_ADDRESS as
  | `0x${string}`
  | undefined;

export default function CreateVestingPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [token, setToken] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals] = useState(18);
  const [start, setStart] = useState("");
  const [cliff, setCliff] = useState("");
  const [end, setEnd] = useState("");

  const { writeContract: approve, data: approveHash, isPending: approving } = useWriteContract();
  const { writeContract: createVesting, data: createHash, isPending: creating } = useWriteContract();
  const { isLoading: approveConfirming } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: created, isLoading: createConfirming } = useWaitForTransactionReceipt({ hash: createHash });

  const { data: tokenSymbol } = useReadContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: token.length === 42 },
  });

  const { data: allowance } = useReadContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && VESTING_MANAGER_ADDRESS ? [address, VESTING_MANAGER_ADDRESS] : undefined,
    query: { enabled: Boolean(address && token && VESTING_MANAGER_ADDRESS) },
  });

  const parsedAmount = amount ? parseUnits(amount, decimals) : 0n;
  const isApproved = Boolean(allowance) && (allowance as bigint) >= parsedAmount && parsedAmount > 0n;
  const canSubmit = Boolean(token && beneficiary && amount && end);
  const toUnix = (v: string) => (v ? BigInt(Math.floor(new Date(v).getTime() / 1000)) : 0n);
  const fmt = (v: string) => (v ? new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");

  if (!VESTING_MANAGER_ADDRESS) {
    return (
      <main className="wrap">
        <Header />
        <div className="card">
          <div className="empty-state">
            <strong>No VestingManager deployed yet</strong>
            <p>
              This is a V1B module (brief.md section 4.2). Set{" "}
              <code className="mono">NEXT_PUBLIC_VESTING_MANAGER_ADDRESS</code> once it exists.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Header />
      <div className="form-split">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <ul className="check">
            <li>
              <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
              Beneficiary, start, optional cliff and end date
            </li>
            <li>
              <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
              Release curve and claimable amounts shown before signing
            </li>
            <li>
              <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
              Only the beneficiary can claim — vested tokens stay in the contract until then
            </li>
          </ul>
          <div className="pill" style={{ width: "fit-content" }}>
            <svg className="icon" aria-hidden="true"><use href="#i-code" /></svg>
            {VESTING_MANAGER_ADDRESS.slice(0, 6)}…{VESTING_MANAGER_ADDRESS.slice(-4)}
          </div>
        </div>

        <div className="stage">
          <div className="card edge float" style={{ maxWidth: 460, marginInline: "auto" }}>
            {!isConnected ? (
              <div className="empty-state" style={{ alignItems: "center", textAlign: "center", padding: "24px 4px" }}>
                <strong>Connect a wallet</strong>
                <p>You need a wallet on Robinhood Chain Testnet to create a vesting schedule.</p>
                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => connect({ connector: connectors[0] })}>
                  Connect wallet
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="field">
                  <label className="field-label" htmlFor="v-token">Token address</label>
                  <input id="v-token" className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x…" />
                  {tokenSymbol ? (
                    <div className="tok-row" style={{ marginTop: 2 }}>
                      <span className="tok-ic">{String(tokenSymbol).slice(0, 2).toUpperCase()}</span>
                      <b style={{ fontSize: 13 }}>{String(tokenSymbol)}</b>
                      <span className="ok-tag">
                        <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
                        Standard ERC-20
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="v-beneficiary">Beneficiary</label>
                  <input id="v-beneficiary" className="input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="0x…" />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="v-amount">Amount</label>
                  <input id="v-amount" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" inputMode="decimal" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label className="field-label" htmlFor="v-start">Start</label>
                    <input id="v-start" className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="v-cliff">Cliff</label>
                    <input id="v-cliff" className="input" type="datetime-local" value={cliff} onChange={(e) => setCliff(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="v-end">End</label>
                    <input id="v-end" className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
                  </div>
                </div>
                <p className="field-note" style={{ marginTop: -6 }}>Blank start = now. Blank cliff = no cliff.</p>

                <div className="review">
                  <div>
                    <dt>Approval (exact amount)</dt>
                    <dd className="mono">{amount || "0"} {tokenSymbol ? String(tokenSymbol) : ""}</dd>
                  </div>
                  <div>
                    <dt>Start → End</dt>
                    <dd>{start ? fmt(start) : "Now"} → {fmt(end)}</dd>
                  </div>
                  <div>
                    <dt>Cliff</dt>
                    <dd>{cliff ? fmt(cliff) : "None"}</dd>
                  </div>
                </div>

                {isApproved ? (
                  <button
                    className="btn btn-primary btn-block"
                    disabled={!canSubmit || creating || createConfirming}
                    onClick={() =>
                      createVesting({
                        address: VESTING_MANAGER_ADDRESS,
                        abi: vestingManagerAbi,
                        functionName: "createVesting",
                        args: [
                          token as `0x${string}`,
                          beneficiary as `0x${string}`,
                          parsedAmount,
                          toUnix(start),
                          toUnix(cliff),
                          toUnix(end),
                        ],
                      })
                    }
                  >
                    {creating ? "Confirm in wallet…" : createConfirming ? "Creating…" : "Create vesting"}
                    <svg className="icon" aria-hidden="true"><use href="#i-arrow" /></svg>
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-block"
                    disabled={!canSubmit || approving || approveConfirming}
                    onClick={() =>
                      approve({
                        address: token as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "approve",
                        args: [VESTING_MANAGER_ADDRESS, parsedAmount],
                      })
                    }
                  >
                    {approving ? "Confirm in wallet…" : approveConfirming ? "Approving…" : "Approve exact amount"}
                  </button>
                )}

                <div className="steps-mini">
                  <span className={isApproved ? "on" : undefined}>1 · Approve</span>
                  <span className="bar" />
                  <span className={created ? "on" : undefined}>2 · Create vesting</span>
                </div>

                {created && (
                  <p style={{ color: "var(--accent)", fontSize: 13, textAlign: "center" }}>
                    Vesting created. Check the dashboard once the indexer catches up.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="page-head">
      <a href="/app" className="back-link">
        <svg className="icon" aria-hidden="true"><use href="#i-arrow" /></svg>
        Dashboard
      </a>
      <div className="page-eyebrow">
        <span className="dot" />
        Linear vesting
      </div>
      <h1>A release plan, set in advance</h1>
      <p className="page-lede">
        Make an allocation available over time. Set the start, optional cliff and end, then let
        the beneficiary claim what has vested.
      </p>
    </div>
  );
}
