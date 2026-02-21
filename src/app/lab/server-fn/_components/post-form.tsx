"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createPost, type CreatePostState } from "../actions";

const initialState: CreatePostState = { error: null, created: null };

// useFormStatus must live inside the <form> — it reads the form's transition context
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
    >
      {pending ? "Saving..." : "Create post"}
    </button>
  );
}

export default function PostForm() {
  // useActionState wraps the server action:
  // - state:   last return value from the server action (starts as initialState)
  // - action:  wrapped version of createPost to pass to <form action={...}>
  // - pending: true while the transition (form submission) is in-flight
  const [state, action, pending] = useActionState(createPost, initialState);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        pending (from useActionState): <strong>{String(pending)}</strong>
      </p>

      {/* React wraps this action in startTransition automatically */}
      <form action={action} className="space-y-3">
        <div className="space-y-1">
          <input
            name="title"
            placeholder="Post title"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            name="body"
            placeholder="Post body"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        {/* SubmitButton is inside the form — useFormStatus can read the form's pending state */}
        <SubmitButton />
      </form>

      {state.created && (
        <div className="rounded-md bg-green-50 p-4 text-sm space-y-1">
          <p className="font-medium">Post created!</p>
          <p>Title: {state.created.title}</p>
          <p>Body: {state.created.body}</p>
        </div>
      )}
    </div>
  );
}
