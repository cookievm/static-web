"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024; // the storage limit on Supabase's free plan

const kinds = [
  { value: "spotify_export", label: "Spotify (Extended Streaming History, .zip or .json)" },
  { value: "listenbrainz_file", label: "ListenBrainz export (.json)" },
  { value: "lastfm_file", label: "Scrobble history (.csv)" },
];

export default function UploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState(kinds[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("That file is over 50 MB. For Spotify, unzip it and upload the JSON files one at a time.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const importId = crypto.randomUUID();
    const filePath = `${userId}/${importId}/${file.name}`;

    // 1. Put the file in storage. Only you can write to your own folder.
    const { error: uploadError } = await supabase.storage.from("imports").upload(filePath, file);
    if (uploadError) {
      setBusy(false);
      setError("The upload didn't work. Please try again.");
      return;
    }

    // 2. Add it to the queue. A background job reads it and adds your plays.
    const { error: insertError } = await supabase
      .from("imports")
      .insert({ id: importId, user_id: userId, kind, file_path: filePath, status: "queued" });

    setBusy(false);
    if (insertError) {
      setError("The file uploaded, but we couldn't queue it. Please try again.");
      return;
    }
    setFile(null);
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={upload}>
      <label htmlFor="kind">What kind of file is it?</label>
      <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
        {kinds.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>

      <label htmlFor="file">File</label>
      <input
        id="file"
        type="file"
        accept=".zip,.json,.csv"
        required
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <button className="button" type="submit" disabled={busy || !file}>
        {busy ? "Uploading..." : "Upload"}
      </button>
      {error && <p className="message error">{error}</p>}
    </form>
  );
}
