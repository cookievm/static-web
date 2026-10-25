import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickPeriod, sinceDate } from "@/lib/stats/periods";
import PeriodTabs from "@/components/PeriodTabs";
import RankedList from "@/components/RankedList";

type Props = { params: Promise<{ communityId: string }>; searchParams: Promise<{ period?: string }> };

type LeaderRow = { user_id: string; display_name: string | null; plays: number };
type SparkRow = { artist_key: string; artist: string; user_id: string; display_name: string | null; plays: number };
type TopRow = { item_key: string; plays: number; listeners: number; artist: string; name: string };

async function communityName(communityId: string) {
  const { data } = await createAdminClient().from("communities").select("name").eq("community_id", communityId).maybeSingle();
  // The bot fills in names; until it has, show a generic title.
  return data?.name ?? "Root community";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${await communityName(decodeURIComponent((await params).communityId))} · static.` };
}

// Public community page: leaderboard, server charts and sparks.
export default async function CommunityPage({ params, searchParams }: Props) {
  const communityId = decodeURIComponent((await params).communityId);
  const period = pickPeriod((await searchParams).period);
  const since = sinceDate(period);
  const admin = createAdminClient();

  const [name, leaders, artists, tracks, sparks] = await Promise.all([
    communityName(communityId),
    admin.rpc("community_leaderboard", { p_community: communityId, p_since: since, p_limit: 25 }),
    admin.rpc("server_top", { p_community: communityId, p_kind: "artist", p_since: since, p_limit: 10 }),
    admin.rpc("server_top", { p_community: communityId, p_kind: "track", p_since: since, p_limit: 10 }),
    admin.rpc("community_sparks", { p_community: communityId, p_limit: 50 }),
  ]);

  const leaderRows = (leaders.data ?? []) as LeaderRow[];
  const sparkRows = (sparks.data ?? []) as SparkRow[];
  const listeners = (n: number) => `${n} ${Number(n) === 1 ? "listener" : "listeners"}`;

  return (
    <div className="profile">
      <header className="profile-head">
        <p className="eyebrow">Community</p>
        <h1>{name}</h1>
        <p className="muted">
          {leaderRows.length > 0 ? `${leaderRows.length} linked listeners on the board` : "Nobody here has linked static. yet."}
        </p>
      </header>

      <PeriodTabs basePath={`/c/${encodeURIComponent(communityId)}`} current={period} />

      <div className="columns">
        <section className="panel">
          <h2>Leaderboard</h2>
          <RankedList
            items={leaderRows.map((r) => ({
              key: r.user_id,
              name: r.display_name ?? "static. user",
              plays: Number(r.plays),
              href: `/u/${r.user_id}`,
            }))}
            empty="No plays in this time yet."
          />
        </section>
        <section className="panel">
          <h2>Top artists</h2>
          <RankedList
            items={((artists.data ?? []) as TopRow[]).map((r) => ({
              key: r.item_key,
              name: r.name || r.artist,
              detail: listeners(r.listeners),
              plays: Number(r.plays),
            }))}
            empty="No plays in this time yet."
          />
        </section>
        <section className="panel">
          <h2>Top tracks</h2>
          <RankedList
            items={((tracks.data ?? []) as TopRow[]).map((r) => ({
              key: r.item_key,
              name: r.name,
              detail: `${r.artist} · ${listeners(r.listeners)}`,
              plays: Number(r.plays),
            }))}
            empty="No plays in this time yet."
          />
        </section>
      </div>

      <section className="panel stack">
        <h2>⚡ Sparks</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          A spark goes to whoever has played an artist the most in this community, with at least 30 plays.
        </p>
        {sparkRows.length > 0 ? (
          <ul className="recent">
            {sparkRows.map((s) => (
              <li key={s.artist_key}>
                <span className="name">
                  {s.artist}
                  <small>
                    <a href={`/u/${s.user_id}`}>{s.display_name ?? "static. user"}</a>
                  </small>
                </span>
                <span className="when">{Number(s.plays).toLocaleString("en-GB")} plays</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No sparks yet.</p>
        )}
      </section>
    </div>
  );
}
