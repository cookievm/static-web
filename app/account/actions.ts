"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type NameState = { status: "idle" | "saved" | "error"; message?: string };

// Saves the name shown on your profile, leaderboards and the bot's cards.
export async function saveDisplayName(_prev: NameState, formData: FormData): Promise<NameState> {
  const name = String(formData.get("display_name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 32) {
    return { status: "error", message: "Your name needs to be 2 to 32 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in first." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "error", message: "Saving isn't set up yet: SUPABASE_SERVICE_ROLE_KEY is missing." };
  }

  const { error } = await createAdminClient().from("users").update({ display_name: name }).eq("id", user.id);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/account");
  return { status: "saved", message: "Saved." };
}
