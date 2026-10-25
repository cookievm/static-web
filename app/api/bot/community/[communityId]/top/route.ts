import { createAdminClient } from "@/lib/supabase/admin";
import { botCheck, botError, periodRange } from "@/lib/api/bot";

// /st server artists|tracks|albums. ?type=artist|track|album (default artist), ?period=, ?limit=
export async function GET(request: Request, ctx: { params: Promise<{ communityId: string }> }) {
  const denied = botCheck(request);
  if (denied) return denied;
  const { communityId } = await ctx.params;

  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? "artist";
  if (!["artist", "track", "album"].includes(type)) return botError(400, "type must be artist, track or album.");
  const range = periodRange(params.get("period"));
  if (!range) return botError(400, "Unknown period.");
  const asked = Number(params.get("limit") ?? 10);
  const limit = Math.min(Math.max(Number.isFinite(asked) ? Math.floor(asked) : 10, 1), 100);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("server_top", {
    p_community: communityId, p_kind: type, p_since: range.since, p_limit: limit,
  });
  if (error) return botError(500, "Could not read server charts.");

  const rows = (data ?? []) as { artist: string; name: string; plays: number; listeners: number }[];
  return Response.json({
    type,
    period: params.get("period") ?? "all",
    items: rows.map((r) => ({ artist: r.artist, name: r.name, plays: Number(r.plays), listeners: Number(r.listeners) })),
  });
}
