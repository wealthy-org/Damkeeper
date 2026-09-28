"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { lockManagerAbi, vestingManagerAbi } from "@/lib/abi";
import { claimableAmount, lockStatus } from "@damkeeper/domain/vesting";

export interface ApiPosition {
  chainId: number;
  manager: string;
  positionId: string;
  kind: "lock" | "vesting";
  amount: string;
  claimedAmount: string;
  unlockTime: string | null;
  startTime: string | null;
  cliffTime: string | null;
  endTime: string | null;
  beneficiary: string;
  withdrawn: boolean;
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function PositionRow({
  position,
  wallet,
  onSettled,
}: {
  position: ApiPosition;
  wallet: `0x${string}`;
  onSettled: () => void;
}) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess, isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) onSettled();
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBeneficiary = position.beneficiary.toLowerCase() === wallet.toLowerCase();
  const now = BigInt(Math.floor(Date.now() / 1000));

  let action: { label: string; onClick: () => void; disabled: boolean } | null = null;

  if (isBeneficiary && position.kind === "lock" && position.unlockTime) {
    const status = lockStatus(BigInt(position.unlockTime), position.withdrawn, now);
    if (status === "withdrawable") {
      action = {
        label: "Withdraw",
        disabled: isPending || confirming,
        onClick: () =>
          writeContract({
            address: position.manager as `0x${string}`,
            abi: lockManagerAbi,
            functionName: "withdraw",
            args: [BigInt(position.positionId)],
          }),
      };
    }
  }

  if (isBeneficiary && position.kind === "vesting" && position.startTime && position.endTime) {
    const claimable = claimableAmount(
      {
        totalAmount: BigInt(position.amount),
        startTime: BigInt(position.startTime),
        cliffTime: BigInt(position.cliffTime ?? "0"),
        endTime: BigInt(position.endTime),
        claimedAmount: BigInt(position.claimedAmount),
      },
      now
    );
    if (claimable > 0n) {
      action = {
        label: "Claim",
        disabled: isPending || confirming,
        onClick: () =>
          writeContract({
            address: position.manager as `0x${string}`,
            abi: vestingManagerAbi,
            functionName: "claim",
            args: [BigInt(position.positionId)],
          }),
      };
    }
  }

  return (
    <tr>
      <td style={{ textTransform: "capitalize" }}>{position.kind}</td>
      <td className="mono">{shorten(position.manager)}</td>
      <td className="mono">{position.amount}</td>
      <td>
        <span className="badge">{position.withdrawn ? "Withdrawn" : "Active"}</span>
      </td>
      <td>
        {action ? (
          <button className="btn btn-ghost" style={{ minHeight: 32, fontSize: 12 }} disabled={action.disabled} onClick={action.onClick}>
            {isPending ? "Confirm in wallet…" : confirming ? "Confirming…" : action.label}
          </button>
        ) : (
          <span style={{ color: "var(--faint)", fontSize: 12 }}>—</span>
        )}
        {error && (
          <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 4, maxWidth: 200 }}>
            {error.message.split("\n")[0]}
          </div>
        )}
      </td>
    </tr>
  );
}
