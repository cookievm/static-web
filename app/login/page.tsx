import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error, next } = await searchParams;
  if (user) redirect(safeNext(next));

  return (
    <div className="narrow">
      <h1>Sign in</h1>
      <p>Enter your email and we&apos;ll send you a link. New here? The same link creates your account.</p>
      {error && <p className="message error">That sign-in link didn&apos;t work or has expired. Please ask for a new one.</p>}
      <LoginForm next={next} />
    </div>
  );
}
