"use client";

import { login } from "../actions";
import { useActionState } from "react";

export function LoginForm() {
  const [loginState, loginAction, loginPending] = useActionState(login, { success: true, message: "" });

  return <><form action={loginAction} className="flex flex-col gap-4 p-4 max-w-md">
    <div className="flex flex-col gap-1">
      <label htmlFor="name" className="text-sm font-medium">Name</label>
      <input id="name" name="name" placeholder="Name" className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
    <div className="flex flex-col gap-1">
      <label htmlFor="password" className="text-sm font-medium">Password</label>
      <input id="password" name="password" type="password" className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
    <button type="submit" disabled={loginPending} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">Login</button>
        </form>
      {loginState.message && (
        <p className={loginState.success ? "text-green-600" : "text-red-600"}>
          {loginState.message}
        </p>
      )}
  </>
}
