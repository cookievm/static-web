import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before every page and keeps the user's login session fresh.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Refreshes the session cookie if it has expired.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skip images, Next's own files, and the scrobbler (/1/) and bot (/api/) APIs, which don't use logins.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|previews/|1/|api/|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
