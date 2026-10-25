"use client";

import { useActionState } from "react";
import { linkRootAccount, type LinkState } from "./actions";

export default function LinkForm({ initialCode }: { initialCode?: string }) {
  const [state, formAction, pending] = useActionState<LinkState, FormData>(linkRootAccount, { status: "idle" });

  if (state.status === "linked") {
    return <p className="message">{state.message}</p>;
  }

  return (
    <form action={formAction}>
      <label htmlFor="code">Code</label>
      <input
        id="code"
        name="code"
        type="text"
        className="code-input"
        autoComplete="off"
        spellCheck={false}
        required
        defaultValue={initialCode}
        placeholder="ABC123"
      />
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Linking..." : "Link my Root account"}
      </button>
      {state.status === "error" && <p className="message error">{state.message}</p>}
    </form>
  );
}
