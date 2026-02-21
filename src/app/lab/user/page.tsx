"use client";

import { use, useContext } from "react";
import { UserContext } from "../_components/user-provider";
import { LoginForm } from "./_components/login-form";
import { logout } from "./actions";

export default function UserPage() {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("UserContext is not provided");
  }
  const id = use(user)?.id;
  return (
    <div className="space-y-4">
      <h1>user: {id}</h1>
      {!id ? (
        <LoginForm />
      ) : (
        <button
          className="bg-red-500 text-white px-4 py-2 rounded-md"
          onClick={logout}
        >
          Logout
        </button>
      )}
    </div>
  );
}
