"use client";

import { useActionState } from "react";
import { saveDisplayName, type NameState } from "./actions";

export default function NameForm({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState<NameState, FormData>(saveDisplayName, { status: "idle" });

  return (
    <form action={formAction}>
      <label htmlFor="display_name">Display name</label>
      <input id="display_name" name="display_name" type="text" maxLength={32} defaultValue={current} required />
      <button className="button small" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save name"}
      </button>
      {state.status !== "idle" && <p className={`message ${state.status === "error" ? "error" : ""}`}>{state.message}</p>}
    </form>
  );
}
