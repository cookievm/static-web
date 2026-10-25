"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

// Emails the user a one-time sign-in link.
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  // The link in the email sends the user back to this site.
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const next = safeNext(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    return { status: "error", message: "We couldn't send the email. Please try again in a minute." };
  }
  return { status: "sent", message: `Check ${email} for your sign-in link.` };
}
