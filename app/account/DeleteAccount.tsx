"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "./actions";

// Two steps on purpose: deleting can't be undone.
export default function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(deleteAccount, { status: "idle" });

  if (!confirming) {
    return (
      <button className="button ghost small" onClick={() => setConfirming(true)}>
        Delete my account
      </button>
    );
  }

  return (
    <form action={formAction}>
      <p>
        This deletes your account, every listen, your stats, tokens, Root links and uploaded files. It can&apos;t be
        undone. Type <strong>delete</strong> to confirm.
      </p>
      <input name="confirm" type="text" autoComplete="off" required />
      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button className="button danger small" type="submit" disabled={pending}>
          {pending ? "Deleting..." : "Delete everything"}
        </button>
        <button className="button ghost small" type="button" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
      {state.status === "error" && <p className="message error">{state.message}</p>}
    </form>
  );
}
