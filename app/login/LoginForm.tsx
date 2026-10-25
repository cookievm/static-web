"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return <p className="message">{state.message} You can close this tab once you&apos;ve clicked it.</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next ?? ""} />
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Email me a sign-in link"}
      </button>
      {state.status === "error" && <p className="message error">{state.message}</p>}
    </form>
  );
}
