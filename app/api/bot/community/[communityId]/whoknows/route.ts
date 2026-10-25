import { createAdminClient } from "@/lib/supabase/admin";
import { botCheck, botError, periodRange } from "@/lib/api/bot";

// /st whoknows. ?type=artist|track|album (default artist), ?artist=, ?name= (track or album), ?period=, ?limit=
// For artists it also checks the spark (30+ plays, ties keep the holder) and reports a new holder.
export async function GET(request: Request, ctx: { params: Promise<{ communityId: string }> }) {
  const denied = botCheck(request);
  if (denied) return denied;
  const { communityId } = await ctx.params;

  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? "artist";
  if (!["artist", "track", "album"].includes(type)) return botError(400, "type must be artist, track or album.");
  const artist = params.get("artist")?.trim() ?? "";
  const name = params.get("name")?.trim() ?? "";
  if (!artist || (type !== "artist" && !name)) return botError(400, "artist (and name for tracks/albums) is required.");
  const range = periodRange(params.get("period"));
  if (!range) return botError(400, "Unknown period.");
  const asked = Number(params.get("limit") ?? 10);
  const limit = Math.min(Math.max(Number.isFinite(asked) ? Math.floor(asked) : 10, 1), 100);

  const admin = createAdminClient();
  const { data: key } = await admin.rpc("item_key", { p_kind: type, p_artist: artist, p_name: name || null });

  const { data, error } = await admin.rpc("who_knows", {
    p_community: communityId, p_kind: type, p_item_key: key, p_since: range.since, p_limit: limit,
  });
  if (error) return botError(500, "Could not read whoknows.");

  let spark = null;
  if (type === "artist") {
    const { data: holder } = await admin.rpc("refresh_spark", { p_community: communityId, p_artist_key: key });
    const h = (holder ?? [])[0];
    if (h) spark = { rootUserId: h.root_user_id, userName: h.display_name, plays: h.plays, since: h.since, isNew: h.changed };
  }

  const rows = (data ?? []) as { root_user_id: string | null; display_name: string | null; plays: number }[];
  return Response.json({
    type,
    period: params.get("period") ?? "all",
    listeners: rows.map((r) => ({ rootUserId: r.root_user_id, userName: r.display_name, plays: Number(r.plays) })),
    spark,
  });
}
