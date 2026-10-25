import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LinkForm from "./LinkForm";

export default async function LinkPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Not signed in yet: sign in first, then come back here with the same code.
  if (!user) redirect(`/login?next=${encodeURIComponent(code ? `/link?code=${code}` : "/link")}`);

  return (
    <div className="narrow">
      <h1>Link Root</h1>
      <p>
        Type <code>/st link</code> in any Root community with static. in it. The bot replies with a code. Enter it here
        within 15 minutes.
      </p>
      <LinkForm initialCode={code} />
    </div>
  );
}
