"use client";

import { useActionState } from "react";
import { submitForm } from "./actions";

export function Form() {
  const [state, action, pending] = useActionState(submitForm, {});

  return (
    <form className="flex flex-col gap-4 p-4" action={action}>
      <input
        type="text"
        placeholder="name"
        name="title"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {state.errors?.title && (
        <p className="text-red-500">{state.errors.title}</p>
      )}
      <input
        type="text"
        placeholder="body"
        name="body"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {state.errors?.body && (
        <p className="text-red-500">{state.errors.body}</p>
      )}
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        disabled={pending}
      >
        {pending ? "Submitting..." : "Submit"}
      </button>
      {state.success && <p className="text-green-500">{state.success}</p>}
    </form>
  );
}
