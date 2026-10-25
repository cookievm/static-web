import { createAdminClient } from "@/lib/supabase/admin";
import { botCheck, botError } from "@/lib/api/bot";

// The bot reports who is in a Root community. Only linked Root accounts are stored.
// Body: { communityId, communityName?, iconUrl?, joined?: rootUserId[], left?: rootUserId[] }
export async function POST(request: Request) {
  const denied = botCheck(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const communityId = typeof body?.communityId === "string" ? body.communityId.trim() : "";
  if (!communityId) return botError(400, "communityId is required.");
  const ids = (list: unknown) =>
    Array.isArray(list) ? list.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 1000) : [];
  const joined = ids(body.joined);
  const left = ids(body.left);

  const admin = createAdminClient();

  if (typeof body.communityName === "string" || typeof body.iconUrl === "string") {
    await admin.from("communities").upsert({
      community_id: communityId,
      name: typeof body.communityName === "string" ? body.communityName : null,
      icon_url: typeof body.iconUrl === "string" ? body.iconUrl : null,
      updated_at: new Date().toISOString(),
    });
  } else {
    await admin.from("communities").upsert({ community_id: communityId }, { ignoreDuplicates: true });
  }

  let added = 0;
  if (joined.length) {
    const { data: links } = await admin.from("root_links").select("user_id").in("root_user_id", joined);
    const rows = [...new Set((links ?? []).map((l) => l.user_id as string))].map((user_id) => ({ community_id: communityId, user_id }));
    if (rows.length) {
      const { error } = await admin.from("community_members").upsert(rows, { ignoreDuplicates: true });
      if (error) return botError(500, "Could not save members.");
      added = rows.length;
    }
  }

  let removed = 0;
  if (left.length) {
    const { data: links } = await admin.from("root_links").select("user_id").in("root_user_id", left);
    const userIds = (links ?? []).map((l) => l.user_id as string);
    if (userIds.length) {
      await admin.from("community_members").delete().eq("community_id", communityId).in("user_id", userIds);
      removed = userIds.length;
    }
  }

  return Response.json({ linkedAdded: added, linkedRemoved: removed });
}
