import { createAdminClient } from "@/lib/supabase/admin";
import { tokenFromRequest, userForToken } from "@/lib/api/tokens";

// Same as ListenBrainz's POST /1/submit-listens, so scrobbler apps can send plays to static.
// Docs: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html

const MAX_LISTENS = 1000;

type Listen = {
  listened_at?: number;
  track_metadata?: {
    artist_name?: string;
    track_name?: string;
    release_name?: string;
    additional_info?: { duration_ms?: number; duration?: number };
  };
};

function fail(code: number, error: string) {
  return Response.json({ code, error }, { status: code });
}

function trackLength(listen: Listen) {
  const info = listen.track_metadata?.additional_info;
  if (typeof info?.duration_ms === "number") return Math.round(info.duration_ms);
  if (typeof info?.duration === "number") return Math.round(info.duration * 1000);
  return null;
}

export async function POST(request: Request) {
  const user = await userForToken(tokenFromRequest(request));
  if (!user) return fail(401, "Invalid authorization token.");

  let body: { listen_type?: string; payload?: Listen[] };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Body is not valid JSON.");
  }

  const type = body.listen_type;
  const listens = body.payload;
  if (!["single", "playing_now", "import"].includes(type ?? "")) return fail(400, "listen_type must be single, playing_now or import.");
  if (!Array.isArray(listens) || listens.length === 0) return fail(400, "payload must be a non-empty list.");
  if (listens.length > MAX_LISTENS) return fail(400, `At most ${MAX_LISTENS} listens per request.`);
  if (type !== "import" && listens.length !== 1) return fail(400, `${type} takes exactly one listen.`);

  for (const listen of listens) {
    if (!listen.track_metadata?.artist_name?.trim() || !listen.track_metadata?.track_name?.trim()) {
      return fail(400, "Every listen needs track_metadata.artist_name and track_name.");
    }
    if (type !== "playing_now" && typeof listen.listened_at !== "number") {
      return fail(400, "Every listen needs listened_at (unix seconds).");
    }
  }

  const admin = createAdminClient();

  // What's on right now: kept in its own table, never counted as a listen.
  if (type === "playing_now") {
    const meta = listens[0].track_metadata!;
    const { error } = await admin.from("now_playing").upsert({
      user_id: user.userId,
      artist: meta.artist_name!.trim(),
      track: meta.track_name!.trim(),
      album: meta.release_name?.trim() || null,
      track_ms: trackLength(listens[0]),
      updated_at: new Date().toISOString(),
    });
    if (error) return fail(500, "Could not save now playing.");
    return Response.json({ status: "ok" });
  }

  // Scrobbler apps only send finished plays, so ms_played stays empty and the listen counts as a play.
  const rows = listens.map((listen) => ({
    user_id: user.userId,
    artist: listen.track_metadata!.artist_name!.trim(),
    track: listen.track_metadata!.track_name!.trim(),
    album: listen.track_metadata!.release_name?.trim() || null,
    listened_at: new Date(listen.listened_at! * 1000).toISOString(),
    ms_played: null,
    track_ms: trackLength(listen),
    source: "scrobbler",
  }));

  // The same play sent twice (same song, same minute) is skipped by the database.
  const { error } = await admin
    .from("listens")
    .upsert(rows, { onConflict: "user_id,artist_key,track_key,listened_minute", ignoreDuplicates: true });
  if (error) return fail(500, "Could not save listens.");

  // A finished play replaces "now playing". Imports are old plays, so they leave it alone.
  if (type === "single") await admin.from("now_playing").delete().eq("user_id", user.userId);

  return Response.json({ status: "ok" });
}
