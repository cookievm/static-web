"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, newToken } from "@/lib/tokens";

export type TokenState = { status: "idle" | "created" | "error"; token?: string; message?: string };

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Makes a new token for a scrobbler app. The full token is only shown once.
export async function createToken(_prev: TokenState, formData: FormData): Promise<TokenState> {
  const userId = await currentUserId();
  if (!userId) return { status: "error", message: "Please sign in first." };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "error", message: "Tokens aren't set up yet: SUPABASE_SERVICE_ROLE_KEY is missing from .env.local." };
  }

  const label = String(formData.get("label") ?? "").trim().slice(0, 40) || "Scrobbler";
  const token = newToken();

  const { error } = await createAdminClient()
    .from("api_tokens")
    .insert({ user_id: userId, token_hash: hashToken(token), label });
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/connect");
  return { status: "created", token };
}

// Stops a token from working. Only deletes tokens that belong to the signed-in user.
export async function deleteToken(formData: FormData) {
  const userId = await currentUserId();
  if (!userId || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  await createAdminClient()
    .from("api_tokens")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("user_id", userId);

  revalidatePath("/connect");
}
