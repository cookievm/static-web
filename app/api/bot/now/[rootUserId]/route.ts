import { botUser } from "@/lib/api/bot";
import { getCovers } from "@/lib/covers";

// Now playing card: what's on (or the last play), plus how often the user has played that track.
// "nowPlaying" is only true for 10 minutes after the scrobbler app last said so.
export async function GET(request: Request, ctx: { params: Promise<{ rootUserId: string }> }) {
  const found = await botUser(request, (await ctx.params).rootUserId);
  if ("response" in found) return found.response;
  const { admin, userId, userName } = found;

  const { data: now } = await admin
    .from("now_playing")
    .select("artist, track, album, updated_at")
    .eq("user_id", userId)
    .gte("updated_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .maybeSingle();

  let track = now ? { artist: now.artist, track: now.track, album: now.album, listenedAt: null as string | null } : null;
  if (!track) {
    const { data: last } = await admin
      .from("plays")
      .select("artist, track, album, listened_at")
      .eq("user_id", userId)
      .order("listened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) track = { artist: last.artist, track: last.track, album: last.album, listenedAt: last.listened_at };
  }

  if (!track) return Response.json({ userName, nowPlaying: false, track: null });

  const { data: plays } = await admin.rpc("track_plays", { p_user: userId, p_artist: track.artist, p_track: track.track });
  const [coverUrl] = await getCovers(admin, [{ artist: track.artist, album: track.album }]);
  return Response.json({ userName, nowPlaying: Boolean(now), track: { ...track, plays: Number(plays ?? 0), coverUrl } });
}
