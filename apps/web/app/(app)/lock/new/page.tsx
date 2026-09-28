"use client";

import { useState } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { erc20Abi, parseUnits } from "viem";
import { lockManagerAbi } from "@/lib/abi";
import { useWrongNetwork } from "../../wrong-network-banner";

// Manager address comes from the deployment manifest once a LockManager exists —
// see packages/config/manifest.testnet.json. Empty until then; the form stays
// disabled rather than pointing at a guessed address (brief.md section 12).
const LOCK_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_LOCK_MANAGER_ADDRESS as `0x${string}` | undefined;

export default function CreateLockPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [token, setToken] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals] = useState(18);
  const [unlockDate, setUnlockDate] = useState("");

  const { writeContract: approve, data: approveHash, isPending: approving } = useWriteContract();
  const { writeContract: createLock, data: createHash, isPending: creating } = useWriteContract();
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
    args: address && LOCK_MANAGER_ADDRESS ? [address, LOCK_MANAGER_ADDRESS] : undefined,
    query: { enabled: Boolean(address && token && LOCK_MANAGER_ADDRESS) },
  });

  const parsedAmount = amount ? parseUnits(amount, decimals) : 0n;
  const isApproved = Boolean(allowance) && (allowance as bigint) >= parsedAmount && parsedAmount > 0n;
  const wrongNetwork = useWrongNetwork();
  const canSubmit = Boolean(token && beneficiary && amount && unlockDate) && !wrongNetwork;

  const unlockLabel = unlockDate
    ? new Date(unlockDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

  if (!LOCK_MANAGER_ADDRESS) {
    return (
      <main className="wrap">
        <Header />
        <div className="card">
          <div className="empty-state">
            <strong>No LockManager deployed yet</strong>
            <p>
              Set <code className="mono">NEXT_PUBLIC_LOCK_MANAGER_ADDRESS</code> after the testnet
              deployment (brief.md phase 2) to enable this form.
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
              One fixed unlock date, set before you sign
            </li>
            <li>
              <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
              The withdrawal wallet is named explicitly and can&apos;t be changed
            </li>
            <li>
              <svg className="icon" aria-hidden="true"><use href="#i-check" /></svg>
              Withdrawal opens only after the unlock date — nobody can rush it
            </li>
          </ul>
          <div className="pill" style={{ width: "fit-content" }}>
            <svg className="icon" aria-hidden="true"><use href="#i-code" /></svg>
            {LOCK_MANAGER_ADDRESS.slice(0, 6)}…{LOCK_MANAGER_ADDRESS.slice(-4)}
          </div>
        </div>

        <div className="stage">
          <div className="card edge float" style={{ maxWidth: 460, marginInline: "auto" }}>
            {!isConnected ? (
              <div className="empty-state" style={{ alignItems: "center", textAlign: "center", padding: "24px 4px" }}>
                <strong>Connect a wallet</strong>
                <p>You need a wallet on Robinhood Chain Testnet to create a lock.</p>
                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => connect({ connector: connectors[0] })}>
                  Connect wallet
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="field">
                  <label className="field-label" htmlFor="lock-token">Token address</label>
                  <input id="lock-token" className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x…" />
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
                  <label className="field-label" htmlFor="lock-beneficiary">Beneficiary</label>
                  <input id="lock-beneficiary" className="input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="0x…" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label className="field-label" htmlFor="lock-amount">Amount</label>
                    <input id="lock-amount" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" inputMode="decimal" />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="lock-unlock">Unlock date (UTC)</label>
                    <input id="lock-unlock" className="input" type="datetime-local" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} />
                  </div>
                </div>

                <div className="review">
                  <div>
                    <dt>Approval (exact amount)</dt>
                    <dd className="mono">{amount || "0"} {tokenSymbol ? String(tokenSymbol) : ""}</dd>
                  </div>
                  <div>
                    <dt>Withdrawal wallet</dt>
                    <dd className="mono">{beneficiary ? `${beneficiary.slice(0, 6)}…${beneficiary.slice(-4)}` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Withdrawable from</dt>
                    <dd>{unlockLabel}</dd>
                  </div>
                </div>

                {isApproved ? (
                  <button
                    className="btn btn-primary btn-block"
                    disabled={!canSubmit || creating || createConfirming}
                    onClick={() =>
                      createLock({
                        address: LOCK_MANAGER_ADDRESS,
                        abi: lockManagerAbi,
                        functionName: "createLock",
                        args: [
                          token as `0x${string}`,
                          beneficiary as `0x${string}`,
                          parsedAmount,
                          BigInt(Math.floor(new Date(unlockDate).getTime() / 1000)),
                        ],
                      })
                    }
                  >
                    {creating ? "Confirm in wallet…" : createConfirming ? "Creating…" : "Create lock"}
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
                        args: [LOCK_MANAGER_ADDRESS, parsedAmount],
                      })
                    }
                  >
                    {approving ? "Confirm in wallet…" : approveConfirming ? "Approving…" : "Approve exact amount"}
                  </button>
                )}

                <div className="steps-mini">
                  <span className={isApproved ? "on" : undefined}>1 · Approve</span>
                  <span className="bar" />
                  <span className={created ? "on" : undefined}>2 · Create lock</span>
                </div>

                {created && (
                  <p style={{ color: "var(--accent)", fontSize: 13, textAlign: "center" }}>
                    Lock created. Check the dashboard once the indexer catches up.
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
        Token lock
      </div>
      <h1>Give your supply a clear unlock date</h1>
      <p className="page-lede">
        Set aside a token allocation until a fixed date. The withdrawal wallet is named now and
        can&apos;t be changed after the lock is created.
      </p>
    </div>
  );
}
