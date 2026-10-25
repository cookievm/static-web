"use client";

import { useActionState, useState } from "react";
import { createToken, type TokenState } from "./actions";

export default function TokenForm() {
  const [state, formAction, pending] = useActionState<TokenState, FormData>(createToken, { status: "idle" });
  const [copied, setCopied] = useState(false);

  if (state.status === "created" && state.token) {
    return (
      <div className="message">
        <p style={{ margin: "0 0 8px" }}>Here&apos;s your new token. Copy it now, because it won&apos;t be shown again.</p>
        <code className="token">{state.token}</code>
        <button
          className="button small"
          style={{ marginTop: 12 }}
          onClick={() => {
            navigator.clipboard.writeText(state.token!);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy token"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <label htmlFor="label">Name it after the app or device (optional)</label>
      <input id="label" name="label" type="text" maxLength={40} placeholder="e.g. Laptop, Phone" />
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create a token"}
      </button>
      {state.status === "error" && <p className="message error">{state.message}</p>}
    </form>
  );
}
