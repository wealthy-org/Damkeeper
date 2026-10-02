"use client";

import { useCallback, useRef, useState } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import type { Abi } from "viem";

// Implements brief.md section 10's transaction status machine end to end:
//   Review -> Awaiting wallet -> Submitted -> Included -> Indexed
// with the documented branches: User rejected, Reverted, Replaced, Cancelled.
// "Indexed" is left to the caller (it depends on the cron indexer catching up,
// not something this hook can observe) — callers show their own "check the
// dashboard once indexed" note once status reaches "included".
export type TxStatus =
  | "idle"
  | "awaiting_wallet"
  | "submitted"
  | "included"
  | "user_rejected"
  | "reverted"
  | "replaced"
  | "cancelled"
  | "error";

interface RunOptions {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
}

export function useTxFlow() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const run = useCallback(
    async (opts: RunOptions) => {
      cancelledRef.current = false;
      setErrorMessage(null);
      setStatus("awaiting_wallet");
      setHash(null);

      let txHash: `0x${string}`;
      try {
        txHash = await writeContractAsync({
          address: opts.address,
          abi: opts.abi,
          functionName: opts.functionName,
          args: opts.args as never,
          value: opts.value,
        });
      } catch (err: unknown) {
        if (cancelledRef.current) {
          setStatus("cancelled");
          return null;
        }
        const e = err as { name?: string; code?: number; message?: string };
        if (e?.name === "UserRejectedRequestError" || e?.code === 4001) {
          setStatus("user_rejected");
        } else {
          setStatus("error");
          setErrorMessage(e?.message?.split("\n")[0] ?? "Transaction failed to send.");
        }
        return null;
      }

      setHash(txHash);
      setStatus("submitted");

      if (!publicClient) return txHash;

      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          onReplaced: (replacement) => {
            if (replacement.reason === "cancelled") {
              setStatus("cancelled");
            } else {
              // "repriced" (speed-up) or "replaced" — the new tx is what actually landed.
              setHash(replacement.transaction.hash);
              setStatus("submitted");
            }
          },
        });

        if (cancelledRef.current) return null;

        if (receipt.status === "reverted") {
          setStatus("reverted");
          return null;
        }

        setStatus("included");
        return receipt;
      } catch (err: unknown) {
        const e = err as { message?: string };
        setStatus("error");
        setErrorMessage(e?.message?.split("\n")[0] ?? "Could not confirm the transaction.");
        return null;
      }
    },
    [writeContractAsync, publicClient]
  );

  const cancelLocal = useCallback(() => {
    // Abandons *this hook's* tracking of the tx (e.g. user changed account/network
    // per brief.md section 10 — "batalkan prepared transaction lokal"). Does not
    // cancel the onchain transaction itself.
    cancelledRef.current = true;
    setStatus("idle");
    setHash(null);
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setStatus("idle");
    setHash(null);
    setErrorMessage(null);
  }, []);

  return { run, status, hash, errorMessage, cancelLocal, reset };
}

export function txStatusLabel(status: TxStatus): string {
  switch (status) {
    case "idle":
      return "";
    case "awaiting_wallet":
      return "Confirm in wallet…";
    case "submitted":
      return "Submitted — waiting for inclusion…";
    case "included":
      return "Included";
    case "user_rejected":
      return "Rejected in wallet";
    case "reverted":
      return "Reverted onchain";
    case "replaced":
      return "Replaced by another transaction";
    case "cancelled":
      return "Cancelled";
    case "error":
      return "Something went wrong";
  }
}
