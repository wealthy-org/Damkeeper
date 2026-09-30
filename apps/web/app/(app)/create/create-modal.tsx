"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LockForm, LOCK_MANAGER_ADDRESS } from "./lock-form";
import { VestingForm, VESTING_MANAGER_ADDRESS } from "./vesting-form";

type Kind = "lock" | "vesting";

const COPY: Record<Kind, { eyebrow: string; title: string; lede: string }> = {
  lock: {
    eyebrow: "Token lock",
    title: "Create a lock",
    lede: "Tokens stay in the contract until the unlock date. The withdrawal wallet can't be changed afterwards.",
  },
  vesting: {
    eyebrow: "Linear vesting",
    title: "Create a vesting schedule",
    lede: "Tokens release every second from start to end. Only the beneficiary can claim what has vested.",
  },
};

/** Opens whenever the URL carries ?create=lock or ?create=vesting, on any /app page. */
export function CreateModal() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  const raw = params.get("create");
  const kind: Kind | null = raw === "lock" || raw === "vesting" ? raw : null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (kind && !dialog.open) dialog.showModal();
    if (!kind && dialog.open) dialog.close();
  }, [kind]);

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete("create");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const manager = kind === "lock" ? LOCK_MANAGER_ADDRESS : kind === "vesting" ? VESTING_MANAGER_ADDRESS : undefined;

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="create-modal-title"
      onClose={() => kind && close()}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === e.currentTarget) close();
      }}
    >
      {kind && (
        <>
          <header className="modal-head">
            <div>
              <div className="page-eyebrow">
                <span className="dot" />
                {COPY[kind].eyebrow}
              </div>
              <h2 id="create-modal-title">{COPY[kind].title}</h2>
              <p>{COPY[kind].lede}</p>
            </div>
            <button className="icon-btn" aria-label="Close" onClick={close}>
              <svg className="icon" aria-hidden="true"><use href="#i-close" /></svg>
            </button>
          </header>
          <div className="modal-body">
            {kind === "lock" ? <LockForm key="lock" onClose={close} /> : <VestingForm key="vesting" onClose={close} />}
          </div>
          {manager && (
            <footer className="modal-foot">
              <span className="mono">Contract {manager.slice(0, 6)}…{manager.slice(-4)}</span>
              <a href="/transparency" style={{ color: "var(--accent)" }}>Verified source</a>
            </footer>
          )}
        </>
      )}
    </dialog>
  );
}
