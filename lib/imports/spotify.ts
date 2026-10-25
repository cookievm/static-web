import { unzipSync, strFromU8 } from "fflate";

// Reads a Spotify Extended Streaming History export (the zip, or one of its JSON files)
// and turns it into rows for the listens table.

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

export type SpotifyListen = {
  artist: string;
  track: string;
  album: string | null;
  listened_at: string;
  ms_played: number;
};

// null = not a song (podcast, audiobook, local file, broken row), so it's skipped.
function toListen(item: SpotifyItem): SpotifyListen | null {
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
  };
}

// Song files only. The Video files are music videos and podcast videos.
const AUDIO_FILE = /Streaming_History_Audio_[^/]*\.json$/i;

// Returns every item in a stable order (files sorted by name), so a job that stops halfway
// can carry on from rows_done next time. Each item is a listen, or null for a skipped row.
export function readSpotifyExport(fileName: string, bytes: Uint8Array): (SpotifyListen | null)[] {
  let texts: string[];
  if (fileName.toLowerCase().endsWith(".zip")) {
    const files = unzipSync(bytes, { filter: (file) => AUDIO_FILE.test(file.name) });
    const names = Object.keys(files).sort();
    if (names.length === 0) throw new Error("No Streaming_History_Audio files in this zip. Is it the Extended streaming history export?");
    texts = names.map((name) => strFromU8(files[name]));
  } else {
    texts = [strFromU8(bytes)];
  }

  const rows: (SpotifyListen | null)[] = [];
  for (const text of texts) {
    const items = JSON.parse(text);
    if (!Array.isArray(items)) throw new Error("This file isn't a Spotify streaming history list.");
    for (const item of items) rows.push(toListen(item));
  }
  return rows;
}
