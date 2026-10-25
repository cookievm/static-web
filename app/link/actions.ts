"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LinkState = { status: "idle" | "linked" | "error"; message?: string };

// Connects the Root account that ran /st link to the signed-in static. account.
export async function linkRootAccount(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { status: "error", message: "Please enter the code from Root." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in first." };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "error", message: "Linking isn't set up yet: SUPABASE_SERVICE_ROLE_KEY is missing from .env.local." };
  }
  const admin = createAdminClient();

  const { data: found, error: findError } = await admin
    .from("link_codes")
    .select("root_user_id, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (findError) return { status: "error", message: "Something went wrong. Please try again." };
  if (!found || new Date(found.expires_at) < new Date()) {
    return { status: "error", message: "That code is wrong or has expired. Type /st link in Root to get a new one." };
  }

  // A Root account can only belong to one static. account, so this moves it if it was linked before.
  const { error: linkError } = await admin
    .from("root_links")
    .upsert({ root_user_id: found.root_user_id, user_id: user.id, linked_at: new Date().toISOString() });
  if (linkError) return { status: "error", message: "Something went wrong. Please try again." };

  // Each code works once.
  await admin.from("link_codes").delete().eq("code", code);

  revalidatePath("/account");
  return { status: "linked", message: "Your Root account is linked. Your /st commands will now use your static. stats." };
}
