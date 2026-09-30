import { getPlatformStats } from "@/lib/platform-stats";

export const dynamic = "force-dynamic";

// GET /api/stats — the same counts the Home page shows (no USD values: there's no price feed).
export async function GET() {
  return Response.json(await getPlatformStats());
}
