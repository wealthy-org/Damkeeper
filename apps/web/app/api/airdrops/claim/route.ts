import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { airdropCampaigns, airdropRecipients } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { robinhoodMainnet } from "@/lib/chains";
import { parseUnits } from "viem";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      chainId = robinhoodMainnet.id,
      campaignId,
      recipient,
      txHash,
    } = body;

    if (!campaignId || !recipient) {
      return NextResponse.json(
        { ok: false, error: "Missing campaignId or recipient" },
        { status: 400 }
      );
    }

    const recAddr = recipient.toLowerCase();
    const now = BigInt(Math.floor(Date.now() / 1000));

    // Find recipient record
    const [rec] = await db
      .select()
      .from(airdropRecipients)
      .where(
        and(
          eq(airdropRecipients.chainId, chainId),
          eq(airdropRecipients.campaignId, campaignId),
          eq(airdropRecipients.recipient, recAddr)
        )
      )
      .limit(1);

    if (!rec) {
      return NextResponse.json(
        { ok: false, error: "No airdrop allocation found for this address" },
        { status: 404 }
      );
    }

    if (rec.isClaimed) {
      return NextResponse.json(
        { ok: false, error: "Airdrop has already been claimed" },
        { status: 400 }
      );
    }

    // Get campaign details
    const [campaign] = await db
      .select()
      .from(airdropCampaigns)
      .where(
        and(
          eq(airdropCampaigns.chainId, chainId),
          eq(airdropCampaigns.campaignId, campaignId)
        )
      )
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.startTime > now) {
      return NextResponse.json(
        { ok: false, error: "Airdrop claim period has not started yet" },
        { status: 400 }
      );
    }

    // Mark recipient as claimed
    await db
      .update(airdropRecipients)
      .set({
        isClaimed: true,
        claimedAt: now,
        claimTxHash: txHash || null,
      })
      .where(
        and(
          eq(airdropRecipients.chainId, chainId),
          eq(airdropRecipients.campaignId, campaignId),
          eq(airdropRecipients.recipient, recAddr)
        )
      );

    // Update campaign claimed count and amount
    const rawClaimAmt = parseUnits(rec.amount, campaign.tokenDecimals);
    const newClaimedAmt = (BigInt(campaign.claimedAmount || "0") + rawClaimAmt).toString();

    await db
      .update(airdropCampaigns)
      .set({
        claimedCount: campaign.claimedCount + 1,
        claimedAmount: newClaimedAmt,
      })
      .where(
        and(
          eq(airdropCampaigns.chainId, chainId),
          eq(airdropCampaigns.campaignId, campaignId)
        )
      );

    return NextResponse.json({
      ok: true,
      amount: rec.amount,
      tokenSymbol: campaign.tokenSymbol,
      txHash: txHash || null,
    });
  } catch (err: any) {
    console.error("Error in /api/airdrops/claim:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to process claim" }, { status: 500 });
  }
}
