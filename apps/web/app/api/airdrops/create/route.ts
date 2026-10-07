import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { airdropCampaigns, airdropRecipients } from "@/db/schema";
import { robinhoodMainnet } from "@/lib/chains";
import { parseUnits } from "viem";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      chainId = robinhoodMainnet.id,
      creator,
      token,
      tokenSymbol,
      tokenDecimals = 18,
      name,
      description,
      mode = "instant",
      startTime,
      endTime,
      vestingDuration,
      recipients, // Array<{ address: string, amount: string }>
      txHash,
    } = body;

    if (!creator || !token || !name || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields (creator, token, name, recipients)" },
        { status: 400 }
      );
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const start = startTime ? BigInt(startTime) : now;
    const campaignId = `ad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    let totalRaw = 0n;
    const recipientRecords = [];

    for (const r of recipients) {
      const rawAmt = parseUnits(r.amount, tokenDecimals);
      totalRaw += rawAmt;
      recipientRecords.push({
        chainId,
        campaignId,
        recipient: r.address.toLowerCase(),
        amount: r.amount,
        isClaimed: false,
      });
    }

    // Insert campaign
    await db.insert(airdropCampaigns).values({
      chainId,
      campaignId,
      creator: creator.toLowerCase(),
      token: token.toLowerCase(),
      tokenSymbol: tokenSymbol || "TOKEN",
      tokenDecimals,
      name,
      description: description || null,
      totalAmount: totalRaw.toString(),
      totalRecipients: recipientRecords.length,
      claimedAmount: "0",
      claimedCount: 0,
      mode,
      startTime: start,
      endTime: endTime ? BigInt(endTime) : null,
      vestingDuration: vestingDuration ? BigInt(vestingDuration) : null,
      txHash: txHash || null,
      createdAt: now,
    });

    // Batch insert recipients
    if (recipientRecords.length > 0) {
      // Chunk into batches of 100 to avoid query limits
      const chunkSize = 100;
      for (let i = 0; i < recipientRecords.length; i += chunkSize) {
        const chunk = recipientRecords.slice(i, i + chunkSize);
        await db.insert(airdropRecipients).values(chunk);
      }
    }

    return NextResponse.json({
      ok: true,
      campaignId,
      totalRecipients: recipientRecords.length,
      totalAmount: totalRaw.toString(),
    });
  } catch (err: any) {
    console.error("Error in /api/airdrops/create:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to create airdrop" }, { status: 500 });
  }
}
