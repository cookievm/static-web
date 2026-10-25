import { createAdminClient } from "@/lib/supabase/admin";
import type { ParsedFile } from "@/lib/imports/shared";
import { readSpotifyExport } from "@/lib/imports/spotify";
import { readLastfmCsv } from "@/lib/imports/lastfm";
import { readListenbrainzExport } from "@/lib/imports/listenbrainz";

// Works through uploaded history files (Spotify, Last.fm, ListenBrainz), one import at a time.
// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
// A big export may not finish in one run: it goes back to "queued" and the next run carries on from rows_done.

export const maxDuration = 300;

const BATCH = 1000;
const TIME_BUDGET_MS = 240_000; // stop well before Vercel's 300 s limit
const STALE_MS = 6 * 60_000;

// imports.kind → the parser for that file, and the source saved on each listen.
const READERS: Record<string, { read: (fileName: string, bytes: Uint8Array) => ParsedFile; source: string }> = {
  spotify_export: { read: readSpotifyExport, source: "spotify_export" },
  lastfm_file: { read: readLastfmCsv, source: "lastfm_file" },
  listenbrainz_file: { read: readListenbrainzExport, source: "listenbrainz_file" },
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }

  const started = Date.now();
  const admin = createAdminClient();

  // A waiting import, or one whose run crashed: still "running" but untouched for 6 minutes.
  // (A healthy run updates the row after every batch, which bumps updated_at.)
  const stale = new Date(Date.now() - STALE_MS).toISOString();
  const { data: next } = await admin
    .from("imports")
    .select("id, status, updated_at")
    .in("kind", Object.keys(READERS))
    .or(`status.eq.queued,and(status.eq.running,updated_at.lt.${stale})`)
    .limit(1)
    .maybeSingle();
  if (!next) return Response.json({ status: "idle" });

  // Claim it. Only works if nobody changed the row since we looked, so two runs never take the same import.
  const { data: job } = await admin
    .from("imports")
    .update({ status: "running" })
    .eq("id", next.id)
    .eq("status", next.status)
    .eq("updated_at", next.updated_at)
    .select("id, user_id, kind, file_path, rows_done, rows_skipped")
    .maybeSingle();
  if (!job) return Response.json({ status: "idle" });

  let rowsDone = job.rows_done ?? 0;
  let rowsSkipped = job.rows_skipped ?? 0;

  try {
    const { data: file, error: downloadError } = await admin.storage.from("imports").download(job.file_path);
    if (downloadError || !file) throw new Error("Could not download the uploaded file.");
    const reader = READERS[job.kind];
    const items = reader.read(job.file_path, new Uint8Array(await file.arrayBuffer()));

    while (rowsDone < items.length && Date.now() - started < TIME_BUDGET_MS) {
      const slice = items.slice(rowsDone, rowsDone + BATCH);
      const rows = slice
        .filter((listen) => listen !== null)
        .map((listen) => ({ ...listen, user_id: job.user_id, import_id: job.id, source: reader.source }));

      // Plays already saved (same song, same minute) are skipped by the database.
      let saved = 0;
      if (rows.length > 0) {
        const { error, count } = await admin
          .from("listens")
          .upsert(rows, { onConflict: "user_id,artist_key,track_key,listened_minute", ignoreDuplicates: true, count: "exact" });
        if (error) throw new Error("Could not save listens.");
        saved = count ?? rows.length;
      }

      rowsDone += slice.length;
      rowsSkipped += slice.length - saved;
      await admin.from("imports").update({ rows_done: rowsDone, rows_skipped: rowsSkipped }).eq("id", job.id);
    }

    const finished = rowsDone >= items.length;
    await admin.from("imports").update({ status: finished ? "done" : "queued" }).eq("id", job.id);
    return Response.json({ status: finished ? "done" : "continuing", rowsDone, total: items.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    await admin.from("imports").update({ status: "failed", error: message }).eq("id", job.id);
    return Response.json({ status: "failed", error: message }, { status: 500 });
  }
}
