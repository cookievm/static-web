import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickPeriod, sinceDate, timeAgo } from "@/lib/stats/periods";
import PeriodTabs from "@/components/PeriodTabs";
import RankedList from "@/components/RankedList";

type Props = { params: Promise<{ userId: string }>; searchParams: Promise<{ period?: string }> };

type TopRow = { item_key: string; plays: number; artist: string; name: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadUser(userId: string) {
  if (!UUID.test(userId)) return null;
  const { data } = await createAdminClient().from("users").select("id, display_name, created_at").eq("id", userId).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await loadUser((await params).userId);
  return { title: user ? `${user.display_name ?? "static. user"} · static.` : "static." };
}

// Public profile: anyone with the link can see it.
export default async function ProfilePage({ params, searchParams }: Props) {
  const { userId } = await params;
  const user = await loadUser(userId);
  if (!user) notFound();

  const period = pickPeriod((await searchParams).period);
  const since = sinceDate(period);
  const admin = createAdminClient();

  const top = (kind: string) => admin.rpc("top_items", { p_user: userId, p_kind: kind, p_since: since, p_limit: 10 });

  const [artists, tracks, albums, recent, nowPlaying, total] = await Promise.all([
    top("artist"),
    top("track"),
    top("album"),
    admin.from("plays").select("id, artist, track, album, listened_at").eq("user_id", userId).order("listened_at", { ascending: false }).limit(10),
    admin.from("now_playing").select("artist, track, updated_at").eq("user_id", userId).maybeSingle(),
    admin.rpc("user_total_plays", { p_user: userId }),
  ]);

  // "Now playing" only counts if the scrobbler app updated it in the last 10 minutes.
  const live = nowPlaying.data && Date.now() - new Date(nowPlaying.data.updated_at).getTime() < 10 * 60_000 ? nowPlaying.data : null;

  const toItems = (rows: TopRow[] | null, withArtist: boolean) =>
    (rows ?? []).map((r) => ({ key: r.item_key, name: r.name || r.artist, detail: withArtist ? r.artist : undefined, plays: Number(r.plays) }));

  const name = user.display_name ?? "static. user";
  const basePath = `/u/${userId}`;

  return (
    <div className="profile">
      <header className="profile-head">
        <p className="eyebrow">Profile</p>
        <h1>{name}</h1>
        <p className="muted">
          {Number(total.data ?? 0).toLocaleString("en-GB")} plays · on static. since{" "}
          {new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        {live && (
          <p className="now">
            <span className="dot" /> Listening to <strong>{live.track}</strong> by {live.artist}
          </p>
        )}
      </header>

      <PeriodTabs basePath={basePath} current={period} />

      <div className="columns">
        <section className="panel">
          <h2>Top artists</h2>
          <RankedList items={toItems(artists.data as TopRow[] | null, false)} empty="No plays in this time yet." />
        </section>
        <section className="panel">
          <h2>Top tracks</h2>
          <RankedList items={toItems(tracks.data as TopRow[] | null, true)} empty="No plays in this time yet." />
        </section>
        <section className="panel">
          <h2>Top albums</h2>
          <RankedList items={toItems(albums.data as TopRow[] | null, true)} empty="No plays in this time yet." />
        </section>
      </div>

      <section className="panel stack">
        <h2>Recent plays</h2>
        {recent.data && recent.data.length > 0 ? (
          <ul className="recent">
            {recent.data.map((p) => (
              <li key={p.id}>
                <span className="name">
                  {p.track}
                  <small>{p.artist}</small>
                </span>
                <span className="when">{timeAgo(p.listened_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Nothing played yet.</p>
        )}
      </section>
    </div>
  );
}
