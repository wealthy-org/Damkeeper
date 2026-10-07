import { and, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { airdropCampaigns, airdropRecipients } from "@/db/schema";
import { robinhoodMainnet } from "@/lib/chains";
import type { AirdropCampaignView, AirdropRecipientView } from "./airdrops-shared";
export * from "./airdrops-shared";

export async function listAirdropCampaigns(params: {
  chainId?: number;
  userAddress?: string;
  tab?: "claimable" | "upcoming" | "created" | "all";
  query?: string;
}): Promise<AirdropCampaignView[]> {
  const chainId = params.chainId ?? robinhoodMainnet.id;
  const user = params.userAddress ? params.userAddress.toLowerCase() : null;
  const tab = params.tab ?? "claimable";
  const now = BigInt(Math.floor(Date.now() / 1000));

  const conditions: SQL[] = [eq(airdropCampaigns.chainId, chainId)];

  if (params.query) {
    const like = `%${params.query.toLowerCase()}%`;
    conditions.push(
      or(
        ilike(airdropCampaigns.name, like),
        ilike(airdropCampaigns.tokenSymbol, like),
        ilike(airdropCampaigns.token, like),
        ilike(airdropCampaigns.campaignId, like)
      )!
    );
  }

  if (tab === "created" && user) {
    conditions.push(eq(airdropCampaigns.creator, user));
  }

  let campaigns: any[] = [];
  try {
    campaigns = await db
      .select()
      .from(airdropCampaigns)
      .where(and(...conditions))
      .orderBy(desc(airdropCampaigns.createdAt))
      .limit(50);
  } catch (err) {
    console.warn("Could not query airdrop_campaigns table:", err);
    return [];
  }

  const results: AirdropCampaignView[] = [];

  for (const c of campaigns) {
    let userAllocation: AirdropRecipientView | null = null;

    if (user) {
      try {
        const [rec] = await db
          .select()
          .from(airdropRecipients)
          .where(
            and(
              eq(airdropRecipients.chainId, chainId),
              eq(airdropRecipients.campaignId, c.campaignId),
              eq(airdropRecipients.recipient, user)
            )
          )
          .limit(1);

        if (rec) {
          userAllocation = {
            recipient: rec.recipient,
            amount: rec.amount,
            isClaimed: rec.isClaimed,
            claimedAt: rec.claimedAt ? rec.claimedAt.toString() : null,
            claimTxHash: rec.claimTxHash,
          };
        }
      } catch (err) {
        console.warn("Could not query airdrop_recipients:", err);
      }
    }

    const item: AirdropCampaignView = {
      chainId: c.chainId,
      campaignId: c.campaignId,
      creator: c.creator,
      token: c.token,
      tokenSymbol: c.tokenSymbol,
      tokenDecimals: c.tokenDecimals,
      name: c.name,
      description: c.description,
      totalAmount: c.totalAmount,
      totalRecipients: c.totalRecipients,
      claimedAmount: c.claimedAmount,
      claimedCount: c.claimedCount,
      mode: (c.mode as "instant" | "vesting") || "instant",
      startTime: c.startTime.toString(),
      endTime: c.endTime ? c.endTime.toString() : null,
      vestingDuration: c.vestingDuration ? c.vestingDuration.toString() : null,
      txHash: c.txHash,
      createdAt: c.createdAt.toString(),
      userAllocation,
    };

    // Filter by tab criteria
    if (tab === "claimable") {
      // Must have allocation, not yet claimed, and campaign has started
      if (userAllocation && !userAllocation.isClaimed && c.startTime <= now) {
        results.push(item);
      }
    } else if (tab === "upcoming") {
      // Campaign start is in the future
      if (c.startTime > now) {
        results.push(item);
      }
    } else if (tab === "created") {
      results.push(item);
    } else {
      results.push(item);
    }
  }

  return results;
}
