"use client";

import { useEffect, useRef, useState } from "react";
import { proofPath, type PositionView } from "@/lib/position-view";
import {
  airdropCaption,
  burnCaption,
  renderAirdropCard,
  renderBurnCard,
  renderShareCard,
  renderStakingCard,
  shareCaption,
  stakingCaption,
  type AirdropShareDetails,
  type BurnShareDetails,
  type StakingShareDetails,
} from "./share-card";

interface ShareSpec {
  eyebrow: string;
  title: string;
  url: string;
  proofHref: string;
  proofLabel: string;
  caption: string;
  fileName: string;
  render: () => Promise<Blob>;
}

export function ShareButton({ position, className = "btn btn-ghost btn-sm" }: { position: PositionView; className?: string }) {
  const [open, setOpen] = useState(false);
  const path = proofPath(position);
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  const spec: ShareSpec = {
    eyebrow: position.kind === "lock" ? "Share this lock" : "Share this schedule",
    title: `Share position #${position.positionId}`,
    url,
    proofHref: path,
    proofLabel: "View proof",
    caption: shareCaption(position),
    fileName: `damkeeper-${position.kind}-${position.positionId}.png`,
    render: () => renderShareCard(position, url),
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
        Share
      </button>
      {open && <ShareDialog spec={spec} onClose={() => setOpen(false)} />}
    </>
  );
}

// Burns have no proof page, so the explorer transaction is the link people check.
export function BurnShareButton({ burn, txUrl, className = "btn btn-ghost btn-sm" }: { burn: BurnShareDetails; txUrl: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const spec: ShareSpec = {
    eyebrow: burn.burnMode === "burn" ? "Share this burn" : "Share this dead-address transfer",
    title: `Share burn ${burn.txHash}`,
    url: txUrl,
    proofHref: txUrl,
    proofLabel: "Blockscout",
    caption: burnCaption(burn),
    fileName: `damkeeper-burn-${burn.txHash.slice(2, 10)}.png`,
    render: () => renderBurnCard(burn, txUrl),
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
        Share proof
      </button>
      {open && <ShareDialog spec={spec} onClose={() => setOpen(false)} />}
    </>
  );
}

export function StakingShareButton({
  staking,
  poolUrl,
  className = "btn btn-ghost btn-sm",
  label = "Share",
}: {
  staking: StakingShareDetails;
  poolUrl: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const spec: ShareSpec = {
    eyebrow: staking.userStaked && staking.userStaked !== "0" ? "Share staked position" : "Share staking pool",
    title: `Share ${staking.poolName}`,
    url: poolUrl,
    proofHref: poolUrl,
    proofLabel: "View pool",
    caption: stakingCaption(staking),
    fileName: `damkeeper-staking-${staking.stakingSymbol.toLowerCase()}-${staking.poolAddress.slice(2, 8)}.png`,
    render: () => renderStakingCard(staking, poolUrl),
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
        {label}
      </button>
      {open && <ShareDialog spec={spec} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AirdropShareButton({
  airdrop,
  className = "btn btn-ghost btn-sm",
  label = "Share",
}: {
  airdrop: AirdropShareDetails;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const airdropUrl = typeof window === "undefined" ? "/airdrops" : `${window.location.origin}/airdrops`;
  const spec: ShareSpec = {
    eyebrow: airdrop.mode === "instant" ? "Share community airdrop" : "Share vested airdrop",
    title: `Share ${airdrop.name}`,
    url: airdropUrl,
    proofHref: airdropUrl,
    proofLabel: "View airdrops",
    caption: airdropCaption(airdrop),
    fileName: `damkeeper-airdrop-${airdrop.tokenSymbol.toLowerCase()}-${airdrop.campaignId.slice(0, 10)}.png`,
    render: () => renderAirdropCard(airdrop, airdropUrl),
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
        {label}
      </button>
      {open && <ShareDialog spec={spec} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareDialog({ spec, onClose }: { spec: ShareSpec; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  const { url, caption, fileName } = spec;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    spec.render()
      .then((b) => {
        setBlob(b);
        objectUrl = URL.createObjectURL(b);
        setPreview(objectUrl);
        const file = new File([b], fileName, { type: "image/png" });
        setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
      })
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // Render once per opened dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enc = encodeURIComponent;
  const xHref = `https://twitter.com/intent/tweet?text=${enc(caption)}&url=${enc(url)}`;
  const tgHref = `https://t.me/share/url?url=${enc(url)}&text=${enc(caption)}`;

  async function shareImage() {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    try {
      await navigator.share({ files: [file], text: caption, url });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = fileName;
    a.click();
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(`${caption} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="modal share"
      aria-labelledby="share-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      <header className="modal-head">
        <div>
          <div className="page-eyebrow">
            <span className="dot" />
            {spec.eyebrow}
          </div>
          <h2 id="share-title" className="sr-only">{spec.title}</h2>
        </div>
        <button className="icon-btn" aria-label="Close" onClick={() => ref.current?.close()}>
          <svg className="icon" aria-hidden="true"><use href="#i-close" /></svg>
        </button>
      </header>

      <div className="modal-body">
        <div className="share-preview">
          {preview ? (
            <img src={preview} alt={`Share card: ${caption}`} width={1200} height={900} />
          ) : (
            <span>{failed ? "Couldn't render the image in this browser. The caption and link still work." : "Rendering…"}</span>
          )}
        </div>

        <div className="share-actions">
          <a className="btn btn-primary" href={xHref} target="_blank" rel="noopener noreferrer">Share on X</a>
          <a className="btn btn-ghost" href={tgHref} target="_blank" rel="noopener noreferrer">Telegram</a>
          <button type="button" className="btn btn-ghost" onClick={shareImage} disabled={!canShareFiles} title={canShareFiles ? undefined : "Your browser can't share files directly — use Download image"}>
            Share image…
          </button>
          <button type="button" className="btn btn-ghost" onClick={download} disabled={!preview}>Download image</button>
          <button type="button" className="btn btn-ghost" onClick={copyCaption}>{copied ? "Copied" : "Copy caption"}</button>
          <a className="btn btn-ghost" href={spec.proofHref} target={spec.proofHref.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {spec.proofLabel}
            <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
          </a>
        </div>

        <p className="share-note">
          The image is made in your browser. On X and Telegram the caption and link are filled in —
          attach the downloaded image, or use Share image on mobile to post it directly.
        </p>
      </div>
    </dialog>
  );
}
