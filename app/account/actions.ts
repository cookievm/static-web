"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export type DeleteState = { status: "idle" | "error"; message?: string };

// Deletes the signed-in user. The database removes everything linked to them (cascade),
// and we remove their uploaded history files from storage.
export async function deleteAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== "delete") {
    return { status: "error", message: "Type delete to confirm." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in first." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "error", message: "Deleting isn't set up yet: SUPABASE_SERVICE_ROLE_KEY is missing." };
  }

  const admin = createAdminClient();

  // Files live at imports/<user id>/<import id>/<file name>.
  const { data: folders } = await admin.storage.from("imports").list(user.id, { limit: 1000 });
  for (const folder of folders ?? []) {
    const { data: files } = await admin.storage.from("imports").list(`${user.id}/${folder.name}`, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${user.id}/${folder.name}/${f.name}`);
    if (paths.length > 0) await admin.storage.from("imports").remove(paths);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
