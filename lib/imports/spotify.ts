import { readTexts, type ImportListen, type ParsedFile } from "./shared";

// Reads a Spotify Extended Streaming History export (the zip, or one of its JSON files).

// Spotify's private session listens are left out for now (open question for ilo).
const SKIP_INCOGNITO = true;

// One item in a Streaming_History_Audio_*.json file. We only read the fields we need,
// so IP addresses and countries are never kept.
type SpotifyItem = {
  ts?: string; // when the listen ENDED, in UTC
  ms_played?: number;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  incognito_mode?: boolean | null;
};

// null = not a song (podcast, audiobook, local file, broken row), so it's skipped.
function toListen(item: SpotifyItem): ImportListen | null {
  const artist = item.master_metadata_album_artist_name?.trim();
  const track = item.master_metadata_track_name?.trim();
  const ended = item.ts ? Date.parse(item.ts) : NaN;
  const msPlayed = typeof item.ms_played === "number" ? Math.max(0, Math.round(item.ms_played)) : null;
  if (!artist || !track || Number.isNaN(ended) || msPlayed === null) return null;
  if (SKIP_INCOGNITO && item.incognito_mode) return null;

  return {
    artist,
    track,
    album: item.master_metadata_album_album_name?.trim() || null,
    // Scrobbles store when a song started, so we do too: end time minus time played.
    listened_at: new Date(ended - msPlayed).toISOString(),
    ms_played: msPlayed,
    // Spotify doesn't say how long songs are, so these count as full plays (30 s or more).
    track_ms: null,
  };
}

// Song files only. The Video files are music videos and podcast videos.
const AUDIO_FILE = /Streaming_History_Audio_[^/]*\.json$/i;

export function readSpotifyExport(fileName: string, bytes: Uint8Array): ParsedFile {
  const texts = readTexts(fileName, bytes, AUDIO_FILE, "No Streaming_History_Audio files in this zip. Is it the Extended streaming history export?");

  const rows: ParsedFile = [];
  for (const text of texts) {
    const items = JSON.parse(text);
    if (!Array.isArray(items)) throw new Error("This file isn't a Spotify streaming history list.");
    for (const item of items) rows.push(toListen(item));
  }
  return rows;
}
