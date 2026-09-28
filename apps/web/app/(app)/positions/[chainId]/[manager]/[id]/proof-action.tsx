"use client";

import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { lockManagerAbi, vestingManagerAbi } from "@/lib/abi";
import { claimableAmount, lockStatus } from "@damkeeper/domain/vesting";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProofAction({
  kind,
  manager,
  positionId,
  beneficiary,
  amount,
  claimedAmount,
  unlockTime,
  startTime,
  cliffTime,
  endTime,
  withdrawn,
}: {
  kind: "lock" | "vesting";
  manager: string;
  positionId: string;
  beneficiary: string;
  amount: string;
  claimedAmount: string;
  unlockTime: string | null;
  startTime: string | null;
  cliffTime: string | null;
  endTime: string | null;
  withdrawn: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess, isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) router.refresh();
  }, [isSuccess, router]);

  if (!isConnected) {
    return (
      <button className="btn btn-ghost" onClick={() => connect({ connector: connectors[0] })}>
        Connect wallet to withdraw or claim
      </button>
    );
  }

  const isBeneficiary = address?.toLowerCase() === beneficiary.toLowerCase();
  if (!isBeneficiary) {
    return <p style={{ fontSize: 12, color: "var(--faint)" }}>Only the beneficiary wallet can withdraw or claim this position.</p>;
  }

  const now = BigInt(Math.floor(Date.now() / 1000));

  if (kind === "lock" && unlockTime) {
    const status = lockStatus(BigInt(unlockTime), withdrawn, now);
    if (status !== "withdrawable") {
      return (
        <p style={{ fontSize: 12, color: "var(--faint)" }}>
          {status === "withdrawn" ? "Already withdrawn." : "Not withdrawable yet — check back after the unlock date."}
        </p>
      );
    }
    return (
      <>
        <button
          className="btn btn-primary"
          disabled={isPending || confirming}
          onClick={() =>
            writeContract({
              address: manager as `0x${string}`,
              abi: lockManagerAbi,
              functionName: "withdraw",
              args: [BigInt(positionId)],
            })
          }
        >
          {isPending ? "Confirm in wallet…" : confirming ? "Confirming…" : "Withdraw"}
        </button>
        {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{error.message.split("\n")[0]}</p>}
      </>
    );
  }

  if (kind === "vesting" && startTime && endTime) {
    const claimable = claimableAmount(
      {
        totalAmount: BigInt(amount),
        startTime: BigInt(startTime),
        cliffTime: BigInt(cliffTime ?? "0"),
        endTime: BigInt(endTime),
        claimedAmount: BigInt(claimedAmount),
      },
      now
    );
    if (claimable <= 0n) {
      return <p style={{ fontSize: 12, color: "var(--faint)" }}>Nothing claimable right now.</p>;
    }
    return (
      <>
        <button
          className="btn btn-primary"
          disabled={isPending || confirming}
          onClick={() =>
            writeContract({
              address: manager as `0x${string}`,
              abi: vestingManagerAbi,
              functionName: "claim",
              args: [BigInt(positionId)],
            })
          }
        >
          {isPending ? "Confirm in wallet…" : confirming ? "Confirming…" : `Claim ${claimable.toString()}`}
        </button>
        {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{error.message.split("\n")[0]}</p>}
      </>
    );
  }

  return null;
}
