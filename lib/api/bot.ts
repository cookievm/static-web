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

// For community routes: only checks the bot key.
export function botCheck(request: Request) {
  if (!isBot(request)) return botError(401, "Wrong or missing bot key.");
  return null;
}

// Community ?period=: calendar week (from Monday), month, quarter or year so far (UTC),
// the rolling ones from periodStart, or all (default). until is always today.
export function periodRange(period: string | null): { since: string | null } | undefined {
  const now = new Date();
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (period ?? "all") {
    case "all":
    case "overall":
      return { since: null };
    case "week": {
      const back = (now.getUTCDay() + 6) % 7;
      return { since: day(new Date(Date.UTC(y, m, now.getUTCDate() - back))) };
    }
    case "month":
      return { since: day(new Date(Date.UTC(y, m, 1))) };
    case "quarter":
      return { since: day(new Date(Date.UTC(y, m - (m % 3), 1))) };
    case "year":
      return { since: day(new Date(Date.UTC(y, 0, 1))) };
    default: {
      const since = periodStart(period);
      return since === undefined ? undefined : { since };
    }
  }
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
