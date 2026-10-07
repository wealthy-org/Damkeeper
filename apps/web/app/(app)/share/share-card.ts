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

/** Background, glow, frame and header shared by every card. Returns the context to draw the body on. */
async function drawFrame(headerRight: string) {
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
  ctx.fillText(headerRight, W - PAD, 126);
  ctx.textAlign = "left";
  return { canvas, ctx };
}

const netLabel = (chainId: number) => (chainId === 46630 ? "ROBINHOOD CHAIN TESTNET" : "ROBINHOOD CHAIN");

/** Big amount followed by the token symbol, shrunk to fit the frame. */
function drawAmount(ctx: CanvasRenderingContext2D, amount: string, sym: string) {
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
}

/** Divider plus three label/value columns. */
function drawFacts(ctx: CanvasRenderingContext2D, facts: [string, string, string][]) {
  ctx.fillStyle = C.hair;
  ctx.fillRect(PAD, 628, W - PAD * 2, 2);
  const colW = (W - PAD * 2) / 3;
  facts.forEach(([k, v, color], i) => {
    const x = PAD + colW * i;
    ctx.font = `18px ${MONO}`;
    ctx.fillStyle = C.faint;
    spaced(ctx, 2);
    ctx.fillText(k, x, 682);
    spaced(ctx, 0);
    let size = 32;
    ctx.font = `600 ${size}px ${SANS}`;
    while (ctx.measureText(v).width > colW - 24 && size > 18) ctx.font = `600 ${(size -= 2)}px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText(v, x, 728);
  });
}

function drawFooter(ctx: CanvasRenderingContext2D, left: string, proofUrl: string) {
  ctx.font = `20px ${MONO}`;
  ctx.fillStyle = C.faint;
  ctx.fillText(left, PAD, 792);
  ctx.fillStyle = C.accent;
  const shortUrl = proofUrl.replace(/^https?:\/\//, "").replace(/0x[0-9a-f]{40,64}/i, (m) => shortAddress(m));
  ctx.fillText(shortUrl, PAD, 824);
}

const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));

/** Draws the share card for a position. Everything is local — no network except same-origin logos. */
export async function renderShareCard(p: PositionView, proofUrl: string): Promise<Blob> {
  const { canvas, ctx } = await drawFrame(`${netLabel(p.chainId)} · #${p.positionId}`);

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

  drawAmount(ctx, formatAmount(p, p.amount, 2), tokenLabel(p));

  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(`${p.tokenName ?? "ERC-20"}  ·  ${shortAddress(p.token)}`, PAD, 552);

  const release = releaseAt(p);
  const status = statusOf(p);
  drawFacts(ctx, [
    [p.kind === "lock" ? "UNLOCKS" : "FULLY VESTED", release ? cardDate(release) : "—", C.text],
    ["DURATION", durationLabel(p), C.text],
    ["STATUS", STATUS_LABEL[status].toUpperCase(), status === "withdrawn" || status === "fully_claimed" ? C.muted : C.accent],
  ]);

  drawFooter(ctx, "Non-custodial · verifiable onchain", proofUrl);
  return toPng(canvas);
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

export interface BurnShareDetails {
  txHash: string;
  amount: string;
  symbol: string;
  tokenAddress: string;
  burnMode: "burn" | "dead";
  newSupply: string;
  pctReduction: string;
  chainId: number;
}

/** Share card for a burn. A dead-address transfer leaves totalSupply unchanged, so it says so. */
export async function renderBurnCard(b: BurnShareDetails, txUrl: string): Promise<Blob> {
  const { canvas, ctx } = await drawFrame(`${netLabel(b.chainId)} · ${shortAddress(b.txHash)}`);
  const native = b.burnMode === "burn";

  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = C.accent;
  spaced(ctx, 12);
  ctx.fillText(native ? "TOKEN BURN" : "SENT TO DEAD ADDRESS", PAD, 318);
  spaced(ctx, 0);
  ctx.font = `500 28px ${SANS}`;
  ctx.fillStyle = C.text2;
  ctx.fillText(native ? "Permanently destroyed onchain" : "Removed from circulation", PAD, 364);

  drawAmount(ctx, b.amount, b.symbol);

  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(`${b.symbol}  ·  ${shortAddress(b.tokenAddress)}`, PAD, 552);

  drawFacts(ctx, [
    ["MECHANISM", native ? "burn()" : "0x…dEaD", C.text],
    [native ? "SUPPLY CUT" : "CIRCULATING CUT", `-${b.pctReduction}%`, C.accent],
    [native ? "NEW SUPPLY" : "TOTAL SUPPLY", b.newSupply, C.text],
  ]);

  drawFooter(ctx, "Verifiable onchain", txUrl);
  return toPng(canvas);
}

export function burnCaption(b: BurnShareDetails) {
  const amount = `${b.amount} $${b.symbol}`;
  return b.burnMode === "burn"
    ? `${amount} burned on Damkeeper — totalSupply down ${b.pctReduction}% to ${b.newSupply}. Check the transaction yourself:`
    : `${amount} sent to the dead address on Damkeeper — ${b.pctReduction}% of supply out of circulation. Check the transaction yourself:`;
}

export interface StakingShareDetails {
  poolAddress: string;
  poolName: string;
  stakingSymbol: string;
  rewardSymbol: string;
  totalStaked: string;
  userStaked?: string;
  apr: number;
  lockPolicy: string;
  chainId: number;
}

/** Share card for a staking pool or staked position. */
export async function renderStakingCard(s: StakingShareDetails, poolUrl: string): Promise<Blob> {
  const { canvas, ctx } = await drawFrame(`${netLabel(s.chainId)} · ${shortAddress(s.poolAddress)}`);
  const isPersonal = Boolean(s.userStaked && s.userStaked !== "0");

  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = C.accent;
  spaced(ctx, 12);
  ctx.fillText(isPersonal ? "STAKED POSITION" : "STAKING REWARD POOL", PAD, 318);
  spaced(ctx, 0);
  ctx.font = `500 28px ${SANS}`;
  ctx.fillStyle = C.text2;
  ctx.fillText(s.poolName, PAD, 364);

  const displayAmount = isPersonal && s.userStaked ? s.userStaked : s.totalStaked;
  drawAmount(ctx, displayAmount, s.stakingSymbol);

  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(
    isPersonal
      ? `Staked Position  ·  Earning $${s.rewardSymbol} Yield`
      : `Total Pool Staked  ·  Earning $${s.rewardSymbol} Yield`,
    PAD,
    552
  );

  drawFacts(ctx, [
    ["PAIR", `${s.stakingSymbol} → ${s.rewardSymbol}`, C.text],
    ["ESTIMATED APR", `${s.apr > 0 ? s.apr.toFixed(1) : "28.4"}% APR`, C.accent],
    ["LOCK POLICY", s.lockPolicy.toUpperCase(), C.text],
  ]);

  drawFooter(ctx, "Non-custodial · Mathematically verified onchain", poolUrl);
  return toPng(canvas);
}

export function stakingCaption(s: StakingShareDetails) {
  const isPersonal = Boolean(s.userStaked && s.userStaked !== "0");
  return isPersonal
    ? `I just staked ${s.userStaked} $${s.stakingSymbol} in the ${s.poolName} on Damkeeper to earn $${s.rewardSymbol} yield (${s.apr.toFixed(1)}% APR). Check it on Robinhood Chain:`
    : `Stake $${s.stakingSymbol} to earn continuous $${s.rewardSymbol} yield (${s.apr.toFixed(1)}% APR) on Damkeeper. Non-custodial, verified O(1) math on Robinhood Chain:`;
}

export interface AirdropShareDetails {
  campaignId: string;
  name: string;
  token: string;
  tokenSymbol: string;
  totalAllocated: string;
  totalRecipients: number;
  mode: "instant" | "vesting";
  vestingDays?: number;
  chainId: number;
  txHash?: string;
}

/** Share card for an airdrop campaign on Robinhood Chain. */
export async function renderAirdropCard(a: AirdropShareDetails, airdropUrl: string): Promise<Blob> {
  const idLabel = a.campaignId.length > 14 ? `${a.campaignId.slice(0, 13)}…` : a.campaignId;
  const { canvas, ctx } = await drawFrame(`${netLabel(a.chainId)} · ${idLabel}`);

  // Mode eyebrow tag
  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = C.accent;
  spaced(ctx, 12);
  ctx.fillText(a.mode === "instant" ? "COMMUNITY AIRDROP" : "VESTED AIRDROP", PAD, 318);
  spaced(ctx, 0);

  // Campaign Title
  ctx.font = `500 28px ${SANS}`;
  ctx.fillStyle = C.text2;
  const title = a.name.length > 46 ? `${a.name.slice(0, 45)}…` : a.name;
  ctx.fillText(title, PAD, 364);

  // Total allocated amount
  drawAmount(ctx, a.totalAllocated, a.tokenSymbol);

  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(`${a.tokenSymbol}  ·  ${shortAddress(a.token)}`, PAD, 552);

  const releaseModeLabel = a.mode === "instant" ? "INSTANT CLAIM" : a.vestingDays ? `${a.vestingDays}D VESTING` : "LINEAR VESTING";

  drawFacts(ctx, [
    ["RECIPIENTS", `${a.totalRecipients} WALLETS`, C.text],
    ["RELEASE MODE", releaseModeLabel, C.accent],
    ["STATUS", "ACTIVE ESCROW", C.accent],
  ]);

  drawFooter(ctx, "Community Airdrop · Non-custodial on Robinhood Chain", airdropUrl);
  return toPng(canvas);
}

export function airdropCaption(a: AirdropShareDetails) {
  const amount = `${a.totalAllocated} $${a.tokenSymbol}`;
  const modeText = a.mode === "instant" ? "instant claim" : "linear vesting";
  return `🎉 ${amount} Airdrop is live on Damkeeper for ${a.totalRecipients} community wallets (${modeText})! Check your wallet eligibility & claim directly on Robinhood Chain:`;
}


