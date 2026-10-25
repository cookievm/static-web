import { botUser } from "@/lib/api/bot";
import { getCovers } from "@/lib/covers";

// Recent plays card. ?limit= (1 to 50, default 5).
export async function GET(request: Request, ctx: { params: Promise<{ rootUserId: string }> }) {
  const found = await botUser(request, (await ctx.params).rootUserId);
  if ("response" in found) return found.response;
  const { admin, userId, userName } = found;

  const asked = Number(new URL(request.url).searchParams.get("limit") ?? 5);
  const limit = Math.min(Math.max(Number.isFinite(asked) ? Math.floor(asked) : 5, 1), 50);

  const { data, error } = await admin
    .from("plays")
    .select("artist, track, album, listened_at")
    .eq("user_id", userId)
    .order("listened_at", { ascending: false })
    .limit(limit);
  if (error) return Response.json({ error: "Could not read plays." }, { status: 500 });

  const { data: now } = await admin
    .from("now_playing")
    .select("artist, track, album")
    .eq("user_id", userId)
    .gte("updated_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .maybeSingle();

  const plays = data ?? [];
  const covers = await getCovers(admin, [...(now ? [now] : []), ...plays]);
  const nowCover = now ? covers.shift() ?? null : null;

  return Response.json({
    userName,
    nowPlaying: now ? { ...now, coverUrl: nowCover } : null,
    plays: plays.map((p, i) => ({ artist: p.artist, track: p.track, album: p.album, listenedAt: p.listened_at, coverUrl: covers[i] })),
  });
}
