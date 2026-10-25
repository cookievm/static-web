import Link from "next/link";
import Bolt from "./Bolt";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="header">
      <Link href="/" className="brand">
        <Bolt size={18} />
        <span>static.</span>
      </Link>
      <nav className="nav">
        {user ? (
          <Link href="/account" className="button small">
            Your account
          </Link>
        ) : (
          <Link href="/login" className="button small">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
