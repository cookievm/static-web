import { createAdminClient } from "@/lib/supabase/admin";
import { isBot } from "@/lib/api/tokens";

export function botError(status: number, error: string) {
  return Response.json({ error }, { status });
}

// Every /api/bot route starts with this: checks the bot key and finds the static. user for a Root user.
// Returns a Response to send back when something is wrong.
export async function botUser(request: Request, rootUserId: string) {
  if (!isBot(request)) return { response: botError(401, "Wrong or missing bot key.") };

  const admin = createAdminClient();
  const { data } = await admin
    .from("root_links")
    .select("user_id, users(display_name)")
    .eq("root_user_id", rootUserId)
    .maybeSingle();
  if (!data) return { response: botError(404, "not_linked") };

  const profile = data.users as unknown as { display_name: string | null } | null;
  return { admin, userId: data.user_id as string, userName: profile?.display_name ?? "static. user" };
}

// Turns ?period= into the first day to count from (null = all time).
export function periodStart(period: string | null) {
  const days: Record<string, number> = { "7day": 7, "1month": 30, "3month": 90, "6month": 180, "12month": 365 };
  if (!period || period === "overall") return null;
  const n = days[period];
  if (!n) return undefined;
  const start = new Date(Date.now() - (n - 1) * 86_400_000);
  return start.toISOString().slice(0, 10);
}
