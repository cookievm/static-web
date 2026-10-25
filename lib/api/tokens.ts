import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Scrobbler tokens are stored as a sha256 hex hash, never as the token itself.
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Reads "Authorization: Token <token>" (what ListenBrainz apps send).
export function tokenFromRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Token\s+(\S+)$/i);
  return match ? match[1] : null;
}

export type TokenUser = { userId: string; userName: string };

// Finds the static. user a scrobbler token belongs to, or null if the token is wrong.
export async function userForToken(token: string | null): Promise<TokenUser | null> {
  if (!token) return null;
  const admin = createAdminClient();

  const { data } = await admin
    .from("api_tokens")
    .select("id, user_id, users(display_name)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return null;

  await admin.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  const profile = data.users as unknown as { display_name: string | null } | null;
  return { userId: data.user_id, userName: profile?.display_name ?? "static. user" };
}

// The bot sends "Authorization: Bearer <STATIC_BOT_KEY>".
export function isBot(request: Request) {
  const key = process.env.STATIC_BOT_KEY;
  if (!key) return false;
  return request.headers.get("authorization") === `Bearer ${key}`;
}
