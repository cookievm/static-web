import { createAdminClient } from "@/lib/supabase/admin";
import { botCheck, botError } from "@/lib/api/bot";

// /st sparkseeder: hands out sparks for every artist from members' all-time plays
// (30+ plays, ties keep the holder). Returns { claimed, moved, total }.
export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ communityId: string }> }) {
  const denied = botCheck(request);
  if (denied) return denied;
  const { communityId } = await ctx.params;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("seed_sparks", { p_community: communityId });
  if (error) return botError(500, "Could not seed sparks.");

  const row = ((data ?? []) as { claimed: number; moved: number; total: number }[])[0] ?? { claimed: 0, moved: 0, total: 0 };
  return Response.json({ claimed: row.claimed, moved: row.moved, total: row.total });
}
