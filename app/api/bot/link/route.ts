import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBot } from "@/lib/api/tokens";
import { botError } from "@/lib/api/bot";

// No 0/O, 1/I or L, so codes are easy to type.
const LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += LETTERS[randomInt(LETTERS.length)];
  return code;
}

// /st link: makes a one-time code (15 minutes) that the user enters on the website's /link page.
// Body: { "rootUserId": "..." }
export async function POST(request: Request) {
  if (!isBot(request)) return botError(401, "Wrong or missing bot key.");

  const body = await request.json().catch(() => null);
  const rootUserId = typeof body?.rootUserId === "string" ? body.rootUserId.trim() : "";
  if (!rootUserId) return botError(400, "rootUserId is required.");

  const admin = createAdminClient();

  // Only the newest code works, and expired codes are cleaned up.
  await admin.from("link_codes").delete().eq("root_user_id", rootUserId);
  await admin.from("link_codes").delete().lt("expires_at", new Date().toISOString());

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode();
    const { data, error } = await admin
      .from("link_codes")
      .insert({ code, root_user_id: rootUserId })
      .select("expires_at")
      .single();
    if (!error) {
      const url = `${new URL(request.url).origin}/link?code=${code}`;
      return Response.json({ code, url, expiresAt: data.expires_at });
    }
  }
  return botError(500, "Could not make a link code.");
}
