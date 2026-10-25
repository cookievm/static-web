import { botError, botUser, periodStart } from "@/lib/api/bot";

// Top artists/tracks/albums. ?type=artist|track|album (default artist),
// ?period=7day|1month|3month|6month|12month|overall (default overall), ?limit= (1 to 100, default 10).
export async function GET(request: Request, ctx: { params: Promise<{ rootUserId: string }> }) {
  const found = await botUser(request, (await ctx.params).rootUserId);
  if ("response" in found) return found.response;
  const { admin, userId, userName } = found;

  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? "artist";
  if (!["artist", "track", "album"].includes(type)) return botError(400, "type must be artist, track or album.");

  const period = params.get("period") ?? "overall";
  const since = periodStart(period);
  if (since === undefined) return botError(400, "Unknown period.");

  const asked = Number(params.get("limit") ?? 10);
  const limit = Math.min(Math.max(Number.isFinite(asked) ? Math.floor(asked) : 10, 1), 100);

  const { data, error } = await admin.rpc("top_items", { p_user: userId, p_kind: type, p_since: since, p_limit: limit });
  if (error) return Response.json({ error: "Could not read top items." }, { status: 500 });

  const items = (data ?? []) as { artist: string; name: string; plays: number }[];
  return Response.json({
    userName,
    type,
    period,
    items: items.map((i) => ({ artist: i.artist, name: i.name, plays: Number(i.plays) })),
  });
}
