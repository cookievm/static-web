import { tokenFromRequest, userForToken } from "@/lib/api/tokens";

// Same as ListenBrainz's GET /1/validate-token. Scrobbler apps call it when you paste in your token.
export async function GET(request: Request) {
  const token = tokenFromRequest(request) ?? new URL(request.url).searchParams.get("token");
  const user = await userForToken(token);

  if (!user) return Response.json({ code: 200, message: "Token invalid.", valid: false });
  return Response.json({ code: 200, message: "Token valid.", valid: true, user_name: user.userName });
}
