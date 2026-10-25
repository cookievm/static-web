import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AutoRefresh from "./AutoRefresh";
import UploadForm from "./UploadForm";

const kindNames: Record<string, string> = {
  spotify_export: "Spotify",
  listenbrainz_file: "ListenBrainz",
  lastfm_file: "Scrobble history",
};

const statusNames: Record<string, string> = {
  queued: "Waiting to start",
  running: "Importing",
  processing: "Importing",
  done: "Finished",
  failed: "Failed",
};

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/import");

  // You can read your own imports (Supabase row-level security).
  const { data: imports } = await supabase
    .from("imports")
    .select("id, kind, file_path, status, rows_done, rows_skipped, error, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const stillRunning = imports?.some((i) => i.status !== "done" && i.status !== "failed");

  return (
    <div className="narrow wide">
      {stillRunning && <AutoRefresh />}
      <h1>Import your history</h1>
      <p>Bring in everything you listened to before static. Uploading the same file twice is safe, because repeats are skipped.</p>

      <section className="panel stack">
        <h3>Where to get your file</h3>
        <ul className="list">
          <li>
            <strong>Spotify:</strong> go to your Spotify account → Privacy settings → Download your data, and tick{" "}
            <em>Extended streaming history</em>. Spotify emails it to you, which can take up to 30 days.
          </li>
          <li>
            <strong>ListenBrainz:</strong> Settings → Export, then download your listens.
          </li>
          <li>
            <strong>Other scrobble history:</strong> a CSV with artist, track, album and time columns.
          </li>
        </ul>
      </section>

      <section className="panel stack">
        <h3>Upload</h3>
        <UploadForm userId={user.id} />
      </section>

      {imports && imports.length > 0 && (
        <section className="panel stack">
          <h3>Your imports</h3>
          <ul className="list">
            {imports.map((i) => (
              <li key={i.id}>
                <div className="row">
                  <span>
                    <strong>{kindNames[i.kind] ?? i.kind}</strong> · {i.file_path.split("/").pop()}
                  </span>
                  <span>{statusNames[i.status] ?? i.status}</span>
                </div>
                <div className="progress">
                  <div className={`progress-bar ${i.status === "done" ? "full" : i.status === "failed" ? "" : "moving"}`} />
                </div>
                <small>
                  {i.rows_done.toLocaleString("en-GB")} listens added
                  {i.rows_skipped > 0 && ` · ${i.rows_skipped.toLocaleString("en-GB")} skipped`}
                  {i.error && ` · ${i.error}`}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
