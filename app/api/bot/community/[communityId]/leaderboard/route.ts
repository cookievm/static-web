import { createAdminClient } from "@/lib/supabase/admin";
import { botCheck, botError, periodRange } from "@/lib/api/bot";

// /st leaderboard: members ranked by total plays. ?period=week|month|quarter|year|all|7day|1month|..., ?limit=
export async function GET(request: Request, ctx: { params: Promise<{ communityId: string }> }) {
  const denied = botCheck(request);
  if (denied) return denied;
  const { communityId } = await ctx.params;

  const params = new URL(request.url).searchParams;
  const range = periodRange(params.get("period"));
  if (!range) return botError(400, "Unknown period.");
  const asked = Number(params.get("limit") ?? 10);
  const limit = Math.min(Math.max(Number.isFinite(asked) ? Math.floor(asked) : 10, 1), 100);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("community_leaderboard", {
    p_community: communityId, p_since: range.since, p_limit: limit,
  });
  if (error) return botError(500, "Could not read the leaderboard.");

  const rows = (data ?? []) as { root_user_id: string | null; display_name: string | null; plays: number }[];
  return Response.json({
    period: params.get("period") ?? "all",
    since: range.since,
    members: rows.map((r) => ({ rootUserId: r.root_user_id, userName: r.display_name, plays: Number(r.plays) })),
  });
}
