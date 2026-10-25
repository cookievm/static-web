// Only allow redirects to pages on this site (stops links that bounce users to other websites).
export function safeNext(next: string | null | undefined, fallback = "/account") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
