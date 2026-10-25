import { createAdminClient } from "@/lib/supabase/admin";
import { botCheck, botError } from "@/lib/api/bot";

// /st sparks. With ?rootUserId= it lists that member's sparks, otherwise every spark in the community. ?limit=
export async function GET(request: Request, ctx: { params: Promise<{ communityId: string }> }) {
  const denied = botCheck(request);
  if (denied) return denied;
  const { communityId } = await ctx.params;

  const params = new URL(request.url).searchParams;
  const rootUserId = params.get("rootUserId");
  const asked = Number(params.get("limit") ?? 50);
  const limit = Math.min(Math.max(Number.isFinite(asked) ? Math.floor(asked) : 50, 1), 500);

  const admin = createAdminClient();

  if (rootUserId) {
    const { data: link } = await admin.from("root_links").select("user_id").eq("root_user_id", rootUserId).maybeSingle();
    if (!link) return botError(404, "not_linked");
    const { data, error } = await admin.rpc("user_sparks", { p_community: communityId, p_user: link.user_id });
    if (error) return botError(500, "Could not read sparks.");
    const rows = (data ?? []) as { artist: string; plays: number; since: string }[];
    return Response.json({ sparks: rows.slice(0, limit).map((r) => ({ artist: r.artist, plays: r.plays, since: r.since })) });
  }

  const { data, error } = await admin.rpc("community_sparks", { p_community: communityId, p_limit: limit });
  if (error) return botError(500, "Could not read sparks.");
  const rows = (data ?? []) as { artist: string; user_id: string; display_name: string | null; plays: number; since: string }[];

  // The Root account for each holder, so the bot can show Root nicknames.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: links } = userIds.length
    ? await admin.from("root_links").select("user_id, root_user_id, linked_at").in("user_id", userIds).order("linked_at", { ascending: false })
    : { data: [] };
  const rootFor = new Map<string, string>();
  for (const l of links ?? []) if (!rootFor.has(l.user_id)) rootFor.set(l.user_id, l.root_user_id);

  return Response.json({
    sparks: rows.map((r) => ({
      artist: r.artist, rootUserId: rootFor.get(r.user_id) ?? null, userName: r.display_name, plays: r.plays, since: r.since,
    })),
  });
}
