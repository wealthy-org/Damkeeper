"use client";

import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { lockManagerAbi, vestingManagerAbi } from "@/lib/abi";
import { claimableAmount, lockStatus } from "@damkeeper/domain/vesting";
import { formatTokenAmount } from "@/lib/amounts";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WithdrawSuccessModal, WithdrawSuccessDetails } from "@/app/(app)/withdraw-success-modal";

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
  tokenSymbol = "TOKENS",
  tokenDecimals = 18,
  chainId = 4663,
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
  tokenSymbol?: string;
  tokenDecimals?: number;
  chainId?: number;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess, isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  const [successDetails, setSuccessDetails] = useState<WithdrawSuccessDetails | null>(null);
  const pendingClaimRef = useRef<bigint>(0n);

  useEffect(() => {
    if (isSuccess && hash) {
      // On-Demand indexing: update database immediately without waiting for cron
      fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chainId, txHash: hash }),
      }).catch(() => null);

      const claimVal = pendingClaimRef.current;
      const formattedAmount =
        kind === "lock"
          ? formatTokenAmount(BigInt(amount), tokenDecimals)
          : formatTokenAmount(claimVal > 0n ? claimVal : BigInt(amount), tokenDecimals);

      setSuccessDetails({
        kind,
        positionId,
        amount: formattedAmount,
        tokenSymbol,
        beneficiary,
        txHash: hash,
        chainId,
        managerAddress: manager,
      });

      router.refresh();
    }
  }, [isSuccess, hash, kind, positionId, amount, tokenDecimals, tokenSymbol, beneficiary, chainId, manager, router]);

  const renderContent = () => {
    if (!isConnected) {
      return (
        <button className="btn btn-ghost" onClick={() => connect({ connector: connectors[0] })}>
          Connect wallet to withdraw or claim
        </button>
      );
    }

    const isBeneficiary = address?.toLowerCase() === beneficiary.toLowerCase();
    if (!isBeneficiary) {
      return (
        <p style={{ fontSize: 12, color: "var(--faint)" }}>
          Only the beneficiary wallet can withdraw or claim this position.
        </p>
      );
    }

    const now = BigInt(Math.floor(Date.now() / 1000));

    if (kind === "lock" && unlockTime) {
      const status = lockStatus(BigInt(unlockTime), withdrawn, now);
      if (status !== "withdrawable") {
        return (
          <p style={{ fontSize: 12, color: "var(--faint)" }}>
            {status === "withdrawn"
              ? "Already withdrawn."
              : "Not withdrawable yet — check back after the unlock date."}
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
          {error && (
            <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>
              {error.message.split("\n")[0]}
            </p>
          )}
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
            onClick={() => {
              pendingClaimRef.current = claimable;
              writeContract({
                address: manager as `0x${string}`,
                abi: vestingManagerAbi,
                functionName: "claim",
                args: [BigInt(positionId)],
              });
            }}
          >
            {isPending
              ? "Confirm in wallet…"
              : confirming
                ? "Confirming…"
                : `Claim ${formatTokenAmount(claimable, tokenDecimals)} ${tokenSymbol}`}
          </button>
          {error && (
            <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>
              {error.message.split("\n")[0]}
            </p>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <>
      {renderContent()}
      <WithdrawSuccessModal
        open={!!successDetails}
        details={successDetails}
        onClose={() => setSuccessDetails(null)}
      />
    </>
  );
}
