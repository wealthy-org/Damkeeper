import type { Metadata } from "next";
import { listAirdropCampaigns } from "@/lib/airdrops";
import { AirdropsDashboard } from "./airdrops-dashboard";

export const metadata: Metadata = {
  title: "Airdrops · Damkeeper",
  description: "Distribute and claim community token airdrops on Robinhood Chain.",
};

export const dynamic = "force-dynamic";

export default async function AirdropsPage() {
  const initialCampaigns = await listAirdropCampaigns({ tab: "all" });

  return <AirdropsDashboard initialCampaigns={initialCampaigns} />;
}
