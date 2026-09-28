"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { erc20Abi, parseUnits } from "viem";
import { lockManagerAbi } from "@/lib/abi";

// Manager address comes from the deployment manifest once a LockManager exists —
// see packages/config/manifest.example.json. Empty until then; the form stays
// disabled rather than pointing at a guessed address (brief.md section 12).
const LOCK_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_LOCK_MANAGER_ADDRESS as `0x${string}` | undefined;

export default function CreateLockPage() {
  const { address, isConnected } = useAccount();
  const [token, setToken] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals] = useState(18);
  const [unlockDate, setUnlockDate] = useState("");

  const { writeContract: approve, data: approveHash, isPending: approving } = useWriteContract();
  const { writeContract: createLock, data: createHash, isPending: creating } = useWriteContract();
  useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: created } = useWaitForTransactionReceipt({ hash: createHash });

  const { data: allowance } = useReadContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && LOCK_MANAGER_ADDRESS ? [address, LOCK_MANAGER_ADDRESS] : undefined,
    query: { enabled: Boolean(address && token && LOCK_MANAGER_ADDRESS) },
  });

  const parsedAmount = amount ? parseUnits(amount, decimals) : 0n;
  const needsApproval = !allowance || allowance < parsedAmount;
  const canSubmit = Boolean(token && beneficiary && amount && unlockDate);

  const header = (
    <div className="page-head">
      <div className="page-eyebrow">
        <span className="dot" />
        Token lock
      </div>
      <h1>Create a lock</h1>
      <p className="page-lede">
        Set aside a token allocation until a fixed unlock date. The withdrawal wallet is named
        now and can&apos;t be changed after the lock is created.
      </p>
    </div>
  );

  if (!LOCK_MANAGER_ADDRESS) {
    return (
      <main className="wrap">
        {header}
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
      {header}
      {!isConnected ? (
        <div className="card">
          <div className="empty-state">
            <strong>Connect a wallet first</strong>
            <p>Go to the dashboard and connect a wallet before creating a lock.</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="field">
            <label className="field-label" htmlFor="lock-token">Token address</label>
            <input id="lock-token" className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x…" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="lock-beneficiary">Beneficiary</label>
            <input id="lock-beneficiary" className="input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="0x…" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="lock-amount">Amount</label>
            <input id="lock-amount" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" inputMode="decimal" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="lock-unlock">Unlock date (UTC)</label>
            <input id="lock-unlock" className="input" type="datetime-local" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} />
          </div>

          {needsApproval ? (
            <button
              className="btn btn-primary btn-block"
              disabled={!canSubmit || approving}
              onClick={() =>
                approve({
                  address: token as `0x${string}`,
                  abi: erc20Abi,
                  functionName: "approve",
                  args: [LOCK_MANAGER_ADDRESS, parsedAmount],
                })
              }
            >
              {approving ? "Approving…" : "Approve exact amount"}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-block"
              disabled={!canSubmit || creating}
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
              {creating ? "Creating…" : "Create lock"}
            </button>
          )}

          {created && (
            <p style={{ color: "var(--accent)", fontSize: 13 }}>
              Lock created. Check the dashboard once the indexer catches up.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
