import { randomUUID } from "crypto";

export { hashToken } from "@/lib/api/tokens";

// Scrobbler apps expect a ListenBrainz-style token, which is a UUID.
export function newToken() {
  return randomUUID();
}
