"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [formState, action, pending] = useActionState(login, { error: "" });

  return (
    <form action={action} className="flex flex-col gap-4 w-full max-w-md p-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        disabled={pending}
      >
        {pending ? "Logging in..." : "Login"}
      </button>
      {formState.error && (
        <p className="text-sm text-red-500">{formState.error}</p>
      )}
    </form>
  );
}
