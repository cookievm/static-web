import { readTexts, toIsoTime, type ImportListen, type ParsedFile } from "./shared";

// Reads a Last.fm history CSV. Last.fm has no export of its own, so we accept the common free tools:
// - lastfm.ghan.nl/export: header "uts,utc_time,artist,artist_mbid,album,album_mbid,track,track_mbid"
// - lastfmstats.com: header like "Artist;Album;AlbumId;Track;TrackId;Date#" (semicolons, time in ms)
// - benjaminbenben's lastfm-to-csv: no header, "artist,album,track,date" with dates like "31 Jan 2021 18:22"
// Any other file with artist, track and a time column in its header works too.

// Splits CSV text into rows of cells. Handles "quoted, cells" and "" inside quotes.
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

// The first column whose name is in the list, or -1.
function column(header: string[], names: string[]) {
  return header.findIndex((h) => names.includes(h));
}

export function readLastfmCsv(fileName: string, bytes: Uint8Array): ParsedFile {
  const texts = readTexts(fileName, bytes, /\.csv$/i, "No CSV file in this zip.");

  const rows: ParsedFile = [];
  for (const text of texts) {
    const firstLine = text.slice(0, text.search(/\r?\n|$/));
    const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
    const table = parseCsv(text, delimiter);
    if (table.length === 0) continue;

    const header = table[0].map((h) => h.trim().toLowerCase().replace(/[#"]/g, ""));
    let artistCol = column(header, ["artist", "artist name", "artist_name"]);
    let trackCol = column(header, ["track", "track name", "track_name", "title", "name", "song"]);
    let albumCol = column(header, ["album", "album name", "album_name", "release"]);
    let timeCol = column(header, ["uts", "timestamp", "date", "utc_time", "time", "played_at", "scrobble time"]);
    let body = table.slice(1);

    // No header: the lastfm-to-csv layout.
    if (artistCol === -1 || trackCol === -1 || timeCol === -1) {
      if (table[0].length < 4 || !toIsoTime(table[0][3])) {
        throw new Error("Couldn't find artist, track and time columns in this CSV.");
      }
      [artistCol, albumCol, trackCol, timeCol] = [0, 1, 2, 3];
      body = table;
    }

    for (const cells of body) {
      const artist = cells[artistCol]?.trim();
      const track = cells[trackCol]?.trim();
      const listenedAt = toIsoTime(cells[timeCol]);
      // Last.fm shows "now playing" rows without a time, and very old scrobbles can have 1970 dates.
      if (!artist || !track || !listenedAt || listenedAt < "2000-01-01") {
        rows.push(null);
        continue;
      }
      const listen: ImportListen = {
        artist,
        track,
        album: (albumCol >= 0 && cells[albumCol]?.trim()) || null,
        listened_at: listenedAt,
        ms_played: null,
        track_ms: null,
      };
      rows.push(listen);
    }
  }
  return rows;
}
