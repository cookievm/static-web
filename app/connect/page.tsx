import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteToken } from "./actions";
import TokenForm from "./TokenForm";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "never";
}

export default async function ConnectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/connect");

  // Without the service role key in .env.local we can't read tokens yet, so show none.
  let tokens: { id: string; label: string | null; created_at: string; last_used_at: string | null }[] | null = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createAdminClient()
      .from("api_tokens")
      .select("id, label, created_at, last_used_at")
      .eq("user_id", user.id)
      .order("created_at");
    tokens = data;
  }

  // The address scrobbler apps send plays to, e.g. https://static-music.vercel.app
  const host = (await headers()).get("host") ?? "localhost:3000";
  const site = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  return (
    <div className="narrow wide">
      <h1>Connect your music</h1>
      <p>
        static. learns what you play from a scrobbler app. The app watches your music player and sends each song to
        static. once you&apos;ve listened to it.
      </p>

      <section className="panel stack">
        <h3>1. Get your token</h3>
        <p>A token is like a password just for your scrobbler app. Make one for each app you use.</p>
        <TokenForm />
        {tokens && tokens.length > 0 && (
          <ul className="list">
            {tokens.map((t) => (
              <li key={t.id} className="row">
                <span>
                  <strong>{t.label ?? "Scrobbler"}</strong> · made {formatDate(t.created_at)} · last used{" "}
                  {formatDate(t.last_used_at)}
                </span>
                <form action={deleteToken}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="button ghost small" type="submit">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack">
        <h3>2. Set up your app</h3>

        <h4>On a computer: Web Scrobbler</h4>
        <p>Works with Spotify, Apple Music, YouTube Music, SoundCloud and more in your browser.</p>
        <ol>
          <li>
            Install{" "}
            <a href="https://web-scrobbler.com" target="_blank" rel="noreferrer">
              Web Scrobbler
            </a>{" "}
            for Chrome, Firefox, Edge or Safari.
          </li>
          <li>Open its settings and go to Accounts.</li>
          <li>
            Under <strong>ListenBrainz</strong>, choose to use a custom server and enter:
            <br />
            API URL: <code>{site}/1/submit-listens</code>
            <br />
            User token: the token from step 1
          </li>
          <li>Save, then play a song for a minute or two.</li>
        </ol>

        <h4>On Android: Pano Scrobbler</h4>
        <p>Works with any music app on your phone.</p>
        <ol>
          <li>Install Pano Scrobbler from the Google Play Store.</li>
          <li>
            Add an account and choose <strong>Custom ListenBrainz</strong>.
          </li>
          <li>
            API URL: <code>{site}/</code>
            <br />
            Token: the token from step 1
          </li>
        </ol>
      </section>

      <section className="panel stack">
        <h3>3. Check it worked</h3>
        <p>
          Type <code>/st recent</code> in Root. Your latest song should be there. The token list above also shows when
          each token was last used.
        </p>
      </section>
    </div>
  );
}
