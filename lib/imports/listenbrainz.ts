import { readTexts, toIsoTime, type ImportListen, type ParsedFile } from "./shared";

// Reads a ListenBrainz export: the zip from Settings → Export (listens/<year>/<month>.jsonl),
// or an older single JSON file with a list of listens. Same listen shape as our scrobble API.

type LbListen = {
  listened_at?: number | string;
  track_metadata?: {
    artist_name?: string;
    track_name?: string;
    release_name?: string;
    additional_info?: { duration_ms?: number; duration?: number };
  };
};

function toListen(item: LbListen): ImportListen | null {
  const meta = item?.track_metadata;
  const artist = meta?.artist_name?.trim();
  const track = meta?.track_name?.trim();
  const listenedAt = toIsoTime(item?.listened_at);
  if (!artist || !track || !listenedAt) return null;

  const info = meta?.additional_info;
  const trackMs =
    typeof info?.duration_ms === "number" ? Math.round(info.duration_ms)
    : typeof info?.duration === "number" ? Math.round(info.duration * 1000)
    : null;

  return { artist, track, album: meta?.release_name?.trim() || null, listened_at: listenedAt, ms_played: null, track_ms: trackMs };
}

// Listen files only, not the feedback or user info files in the same zip.
const LISTEN_FILE = /(^|\/)listens.*\.jsonl?$/i;

export function readListenbrainzExport(fileName: string, bytes: Uint8Array): ParsedFile {
  const texts = readTexts(fileName, bytes, LISTEN_FILE, "No listens files in this zip. Is it the ListenBrainz export?");

  const rows: ParsedFile = [];
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[")) {
      for (const item of JSON.parse(trimmed)) rows.push(toListen(item));
      continue;
    }
    // JSON Lines: one listen per line. A broken line is skipped, not fatal.
    for (const line of trimmed.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        rows.push(toListen(JSON.parse(line)));
      } catch {
        rows.push(null);
      }
    }
  }
  return rows;
}
