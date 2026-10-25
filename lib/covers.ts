import type { SupabaseClient } from "@supabase/supabase-js";

// Album covers from Cover Art Archive, found through a MusicBrainz search and cached in the covers table.
// MusicBrainz allows about 1 request a second, so each call looks up at most MAX_LOOKUPS new albums;
// the rest come back null and get filled in on a later request.

const USER_AGENT = "static-bot/0.1 ( https://static-web-five-dun.vercel.app )";
const MAX_LOOKUPS = 3;
const RETRY_MISSES_AFTER_DAYS = 30;

export type CoverRequest = { artist: string; album: string | null | undefined };

type CachedRow = { artist: string; album: string; artist_key: string; album_key: string; url: string | null; checked_at: string | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Lucene query syntax needs these characters escaped.
function quote(text: string) {
  return `"${text.replace(/[\\"]/g, "\\$&")}"`;
}

async function lookUp(artist: string, album: string): Promise<{ mbid: string | null; url: string | null }> {
  const query = `releasegroup:${quote(album)} AND artist:${quote(artist)}`;
  const search = await fetch(
    `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=3`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(5000) },
  );
  if (!search.ok) throw new Error(`MusicBrainz ${search.status}`);
  const found = (await search.json()) as { "release-groups"?: { id: string; score: number }[] };

  for (const group of found["release-groups"] ?? []) {
    if (group.score < 90) break;
    const art = await fetch(`https://coverartarchive.org/release-group/${group.id}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (art.status === 404) continue;
    if (!art.ok) throw new Error(`Cover Art Archive ${art.status}`);
    const data = (await art.json()) as { images?: { front: boolean; image: string; thumbnails?: Record<string, string> }[] };
    const front = data.images?.find((i) => i.front) ?? data.images?.[0];
    const url = front?.thumbnails?.["500"] ?? front?.thumbnails?.large ?? front?.image;
    if (url) return { mbid: group.id, url: url.replace(/^http:/, "https:") };
  }
  return { mbid: null, url: null };
}

// Returns one cover URL (or null) per request, in the same order.
export async function getCovers(admin: SupabaseClient, items: CoverRequest[]): Promise<(string | null)[]> {
  const pairs = items.map((i) => ({ artist: i.artist, album: i.album?.trim() || "" }));
  const withAlbum = pairs.filter((p) => p.album);
  if (!withAlbum.length) return items.map(() => null);

  const { data } = await admin.rpc("get_covers", { p_pairs: withAlbum });
  const rows = (data ?? []) as CachedRow[];
  const byKey = new Map<string, string | null>();
  const keyFor = new Map<string, string>();
  for (const r of rows) {
    const k = `${r.artist_key}\u001f${r.album_key}`;
    keyFor.set(`${r.artist}\u001f${r.album}`, k);
    const stale = !r.url && r.checked_at && Date.now() - Date.parse(r.checked_at) > RETRY_MISSES_AFTER_DAYS * 86_400_000;
    if (r.checked_at && !stale) byKey.set(k, r.url);
  }

  let lookups = 0;
  for (const r of rows) {
    const k = `${r.artist_key}\u001f${r.album_key}`;
    if (byKey.has(k) || lookups >= MAX_LOOKUPS) continue;
    if (lookups > 0) await sleep(1100);
    lookups++;
    try {
      const found = await lookUp(r.artist, r.album);
      byKey.set(k, found.url);
      await admin.from("covers").upsert({
        artist_key: r.artist_key, album_key: r.album_key, mbid: found.mbid, url: found.url, checked_at: new Date().toISOString(),
      });
    } catch {
      // Network trouble or rate limit: leave it uncached and try again next time.
    }
  }

  return pairs.map((p) => (p.album ? byKey.get(keyFor.get(`${p.artist}\u001f${p.album}`) ?? "") ?? null : null));
}
