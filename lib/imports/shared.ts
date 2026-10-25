import { unzipSync, strFromU8 } from "fflate";

// One listen read from a history file, ready for the listens table.
// ms_played is null when the file doesn't say (Last.fm, ListenBrainz): those already passed the scrobble rule.
export type ImportListen = {
  artist: string;
  track: string;
  album: string | null;
  listened_at: string; // when the song started, ISO in UTC
  ms_played: number | null;
  track_ms: number | null;
};

// Every parser returns one entry per row in the file, in a stable order, so a job that stops
// halfway can carry on from rows_done. null = a row we skip (not a song, or broken).
export type ParsedFile = (ImportListen | null)[];

// The text of each file we want: from inside a zip (matching `wanted`, sorted by name), or the file itself.
export function readTexts(fileName: string, bytes: Uint8Array, wanted: RegExp, missing: string): string[] {
  if (!fileName.toLowerCase().endsWith(".zip")) return [clean(strFromU8(bytes))];

  const files = unzipSync(bytes, { filter: (file) => wanted.test(file.name) });
  const names = Object.keys(files).sort();
  if (names.length === 0) throw new Error(missing);
  return names.map((name) => clean(strFromU8(files[name])));
}

// Removes the invisible "byte order mark" some programs put at the start of a file.
function clean(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// A time from a file as an ISO string, or null if it can't be read.
// Numbers are unix seconds (or milliseconds when they're that big). Text without a time zone is UTC.
export function toIsoTime(value: unknown): string | null {
  if (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value.trim()))) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n < 1e11 ? n * 1000 : n).toISOString();
  }
  if (typeof value !== "string" || !value.trim()) return null;

  let text = value.trim().replace(",", "");
  const isIso = /^\d{4}-\d{2}-\d{2}/.test(text);
  const hasZone = /(Z|[+-]\d{2}:?\d{2}|UTC|GMT)$/i.test(text);
  if (!hasZone) text = isIso ? `${text.replace(" ", "T")}Z` : `${text} UTC`;

  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
