import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import NameForm from "./NameForm";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // You can read your own users row (Supabase row-level security).
  const { data: profile } = await supabase.from("users").select("display_name").eq("id", user.id).maybeSingle();

  // Without the service role key in .env.local we can't read links yet, so show none.
  let rootLinks: { root_user_id: string; linked_at: string }[] | null = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createAdminClient()
      .from("root_links")
      .select("root_user_id, linked_at")
      .eq("user_id", user.id)
      .order("linked_at");
    rootLinks = data;
  }

  return (
    <div className="narrow">
      <h1>Your account</h1>
      <p>
        Signed in as <strong>{user.email}</strong>.
      </p>

      <div className="panel" style={{ margin: "24px 0" }}>
        <h3>Your profile</h3>
        <p>This name shows on your profile and on community leaderboards.</p>
        <NameForm current={profile?.display_name ?? ""} />
        <p style={{ marginTop: 16 }}>
          <Link href={`/u/${user.id}`}>View your public profile →</Link>
        </p>
      </div>

      <div className="panel" style={{ margin: "24px 0" }}>
        <h3>Root</h3>
        {rootLinks && rootLinks.length > 0 ? (
          <ul className="list">
            {rootLinks.map((link) => (
              <li key={link.root_user_id}>
                Linked {new Date(link.linked_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ marginBottom: 16 }}>Your Root account isn&apos;t linked yet.</p>
        )}
        <Link href="/link" className="button small">
          Link a Root account
        </Link>
      </div>

      <div className="panel" style={{ margin: "24px 0" }}>
        <h3>Your music</h3>
        <p style={{ marginBottom: 16 }}>Connect a scrobbler app so static. sees what you play.</p>
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <Link href="/connect" className="button small">
            Connect your music
          </Link>
          <Link href="/import" className="button ghost small">
            Import your history
          </Link>
        </div>
      </div>

      <form action="/auth/signout" method="post">
        <button className="button ghost" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
