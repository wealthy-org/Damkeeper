import { durationLabel, formatAmount, releaseAt, shortAddress, statusOf, STATUS_LABEL, tokenLabel, type PositionView } from "@/lib/position-view";

const W = 1200;
const H = 900;
const PAD = 96;

const C = {
  bg: "#0b110e",
  text: "#f2f5ee",
  text2: "#d1dacf",
  muted: "#95a595",
  faint: "#819181",
  accent: "#b8f36b",
  hair: "rgba(226, 240, 220, 0.14)",
};

const SANS = "Geist, ui-sans-serif, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";

export const cardDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function spaced(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Draws the share card for a position. Everything is local — no network except same-origin logos. */
export async function renderShareCard(p: PositionView, proofUrl: string): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`600 110px Geist`),
    document.fonts.load(`500 30px Geist`),
    document.fonts.load(`20px 'Geist Mono'`),
  ]).catch(() => undefined);
  const [wordmark, symbol] = await Promise.all([
    loadImage("/logo-wordmark.png").catch(() => null),
    loadImage("/logo-symbol.png").catch(() => null),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background, soft accent glow, inner frame.
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.78, H * 0.2, 0, W * 0.78, H * 0.2, W * 0.7);
  glow.addColorStop(0, "rgba(184, 243, 107, 0.16)");
  glow.addColorStop(1, "rgba(184, 243, 107, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 40, 40, W - 80, H - 80, 28);
  ctx.strokeStyle = C.hair;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (symbol) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.drawImage(symbol, W - 560, H - 600, 540, 540);
    ctx.restore();
  }

  // Header: wordmark + network/position id.
  if (wordmark) ctx.drawImage(wordmark, PAD, 96, (44 * wordmark.width) / wordmark.height, 44);
  ctx.font = `20px ${MONO}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = "right";
  const netLabel = p.chainId === 46630 ? "ROBINHOOD CHAIN TESTNET" : "ROBINHOOD CHAIN";
  ctx.fillText(`${netLabel} · #${p.positionId}`, W - PAD, 126);
  ctx.textAlign = "left";

  // Kind + label.
  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = C.accent;
  spaced(ctx, 12);
  ctx.fillText(p.kind === "lock" ? "TOKEN LOCK" : "LINEAR VESTING", PAD, 318);
  spaced(ctx, 0);
  ctx.font = `500 28px ${SANS}`;
  ctx.fillStyle = C.text2;
  const title = p.label ?? `${tokenLabel(p)} ${p.kind === "lock" ? "lockup" : "vesting"}`;
  ctx.fillText(title.length > 48 ? `${title.slice(0, 47)}…` : title, PAD, 364);

  // Amount + symbol, shrunk to fit the frame.
  const amount = formatAmount(p, p.amount, 2);
  const sym = tokenLabel(p);
  let size = 116;
  const fit = () => {
    ctx.font = `600 ${size}px ${SANS}`;
    const a = ctx.measureText(amount).width;
    ctx.font = `600 ${Math.round(size * 0.72)}px ${SANS}`;
    return a + 24 + ctx.measureText(sym).width;
  };
  while (fit() > W - PAD * 2 && size > 48) size -= 4;
  ctx.font = `600 ${size}px ${SANS}`;
  ctx.fillStyle = C.text;
  spaced(ctx, -2);
  ctx.fillText(amount, PAD, 500);
  const amountWidth = ctx.measureText(amount).width;
  ctx.font = `600 ${Math.round(size * 0.72)}px ${SANS}`;
  ctx.fillStyle = C.accent;
  ctx.fillText(sym, PAD + amountWidth + 24, 500);
  spaced(ctx, 0);

  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(`${p.tokenName ?? "ERC-20"}  ·  ${shortAddress(p.token)}`, PAD, 552);

  // Divider + three facts.
  ctx.fillStyle = C.hair;
  ctx.fillRect(PAD, 628, W - PAD * 2, 2);

  const release = releaseAt(p);
  const status = statusOf(p);
  const facts: [string, string, string][] = [
    [p.kind === "lock" ? "UNLOCKS" : "FULLY VESTED", release ? cardDate(release) : "—", C.text],
    ["DURATION", durationLabel(p), C.text],
    ["STATUS", STATUS_LABEL[status].toUpperCase(), status === "withdrawn" || status === "fully_claimed" ? C.muted : C.accent],
  ];
  const colW = (W - PAD * 2) / 3;
  facts.forEach(([k, v, color], i) => {
    const x = PAD + colW * i;
    ctx.font = `18px ${MONO}`;
    ctx.fillStyle = C.faint;
    spaced(ctx, 2);
    ctx.fillText(k, x, 682);
    spaced(ctx, 0);
    ctx.font = `600 32px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText(v, x, 728);
  });

  // Footer.
  ctx.font = `20px ${MONO}`;
  ctx.fillStyle = C.faint;
  ctx.fillText("Non-custodial · verifiable onchain", PAD, 792);
  ctx.fillStyle = C.accent;
  const shortUrl = proofUrl.replace(/^https?:\/\//, "").replace(/0x[0-9a-f]{40}/i, (m) => shortAddress(m));
  ctx.fillText(shortUrl, PAD, 824);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

export function shareCaption(p: PositionView) {
  const amount = `${formatAmount(p, p.amount, 2)} ${tokenLabel(p)}`;
  if (p.kind === "lock") {
    const release = releaseAt(p);
    return `${amount} is locked on Damkeeper until ${release ? cardDate(release) : "its unlock date"}. The terms are fixed onchain — check them yourself:`;
  }
  const start = p.startTime ? cardDate(new Date(Number(p.startTime) * 1000)) : "its start";
  const end = releaseAt(p);
  const cliff = p.cliffTime && p.cliffTime !== "0" ? ` with a cliff on ${cardDate(new Date(Number(p.cliffTime) * 1000))}` : "";
  return `${amount} vests on Damkeeper from ${start} to ${end ? cardDate(end) : "its end date"}${cliff}. Check the schedule onchain:`;
}
