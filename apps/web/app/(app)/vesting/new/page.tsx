"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { erc20Abi, parseUnits } from "viem";
import { vestingManagerAbi } from "@/lib/abi";

const VESTING_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_VESTING_MANAGER_ADDRESS as
  | `0x${string}`
  | undefined;

export default function CreateVestingPage() {
  const { address, isConnected } = useAccount();
  const [token, setToken] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals] = useState(18);
  const [start, setStart] = useState("");
  const [cliff, setCliff] = useState("");
  const [end, setEnd] = useState("");

  const { writeContract: approve, data: approveHash, isPending: approving } = useWriteContract();
  const { writeContract: createVesting, data: createHash, isPending: creating } = useWriteContract();
  useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: created } = useWaitForTransactionReceipt({ hash: createHash });

  const { data: allowance } = useReadContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && VESTING_MANAGER_ADDRESS ? [address, VESTING_MANAGER_ADDRESS] : undefined,
    query: { enabled: Boolean(address && token && VESTING_MANAGER_ADDRESS) },
  });

  const parsedAmount = amount ? parseUnits(amount, decimals) : 0n;
  const needsApproval = !allowance || allowance < parsedAmount;
  const canSubmit = Boolean(token && beneficiary && amount && end);
  const toUnix = (v: string) => (v ? BigInt(Math.floor(new Date(v).getTime() / 1000)) : 0n);

  const header = (
    <div className="page-head">
      <div className="page-eyebrow">
        <span className="dot" />
        Linear vesting
      </div>
      <h1>Create a vesting schedule</h1>
      <p className="page-lede">
        Release tokens in a straight line from start to end, with an optional cliff. Only the
        beneficiary can claim.
      </p>
    </div>
  );

  if (!VESTING_MANAGER_ADDRESS) {
    return (
      <main className="wrap">
        {header}
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
      {header}
      {!isConnected ? (
        <div className="card">
          <div className="empty-state">
            <strong>Connect a wallet first</strong>
            <p>Go to the dashboard and connect a wallet before creating a vesting schedule.</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Token address" value={token} onChange={setToken} placeholder="0x…" />
          <Field label="Beneficiary" value={beneficiary} onChange={setBeneficiary} placeholder="0x…" />
          <Field label="Amount" value={amount} onChange={setAmount} placeholder="0.0" />
          <Field label="Start (blank = now)" type="datetime-local" value={start} onChange={setStart} />
          <Field label="Cliff (blank = none)" type="datetime-local" value={cliff} onChange={setCliff} />
          <Field label="End" type="datetime-local" value={end} onChange={setEnd} />

          {needsApproval ? (
            <button
              className="btn btn-primary btn-block"
              disabled={!canSubmit || approving}
              onClick={() =>
                approve({
                  address: token as `0x${string}`,
                  abi: erc20Abi,
                  functionName: "approve",
                  args: [VESTING_MANAGER_ADDRESS, parsedAmount],
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
              {creating ? "Creating…" : "Create vesting"}
            </button>
          )}

          {created && (
            <p style={{ color: "var(--accent)", fontSize: 13 }}>
              Vesting created. Check the dashboard once the indexer catches up.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
