"use client";

import { useEffect, useRef, useState } from "react";
import { proofPath, type PositionView } from "@/lib/position-view";
import { renderShareCard, shareCaption } from "./share-card";

export function ShareButton({ position, className = "btn btn-ghost btn-sm" }: { position: PositionView; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <svg className="icon" aria-hidden="true"><use href="#i-up" /></svg>
        Share
      </button>
      {open && <ShareDialog position={position} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareDialog({ position, onClose }: { position: PositionView; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  const url = typeof window === "undefined" ? proofPath(position) : `${window.location.origin}${proofPath(position)}`;
  const caption = shareCaption(position);
  const fileName = `damkeeper-${position.kind}-${position.positionId}.png`;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    renderShareCard(position, url)
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
            {position.kind === "lock" ? "Share this lock" : "Share this schedule"}
          </div>
          <h2 id="share-title" className="sr-only">Share position #{position.positionId}</h2>
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
          <a className="btn btn-ghost" href={proofPath(position)}>
            View proof
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
