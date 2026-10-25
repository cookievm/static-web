import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy · static." };

export default function PrivacyPage() {
  return (
    <div className="narrow wide prose">
      <h1>Privacy</h1>
      <p className="muted">Last updated 25 October 2026</p>

      <h2>What we keep</h2>
      <ul>
        <li>Your email address, so you can sign in.</li>
        <li>Your display name.</li>
        <li>Your Root user id and the Root communities you use static. in, once you link your account.</li>
        <li>
          Every song your scrobbler app or history file sends us: artist, track, album, when you played it and, when
          the app sends it, how long you listened.
        </li>
        <li>History files you upload, until they&apos;ve been imported.</li>
        <li>Scrobbler tokens, stored only in scrambled (hashed) form.</li>
      </ul>

      <h2>Who can see it</h2>
      <ul>
        <li>Your profile page, with your display name, top artists, tracks, albums and recent plays, is public.</li>
        <li>Members of the Root communities you&apos;ve linked see you on that community&apos;s leaderboards, sparks and who-knows charts.</li>
        <li>Your email address is never shown to anyone.</li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell or share your data.</li>
        <li>We don&apos;t use ads or trackers.</li>
      </ul>

      <h2>Where it&apos;s stored</h2>
      <p>
        Your data is stored with Supabase (database, sign-in and file storage, in the United States). The website runs on
        Vercel.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete your account at any time from your account page. That removes your listens, stats, tokens, Root
        links and uploaded files straight away.
      </p>
    </div>
  );
}
