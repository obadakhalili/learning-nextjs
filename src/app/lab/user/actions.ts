"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "../lib/session";
import { users } from "../data";

interface LoginFormState {
  success: boolean;
  message: string;
}

export async function login(state: LoginFormState, formData: FormData) {
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;
  const user = users.find(
    (user) => user.name === name && user.password === password,
  );
  if (!user) {
    return { success: false, message: "Invalid name or password" };
  }
  await createSession(user.name);
  redirect("/lab/user");
}

export async function logout() {
  await deleteSession();
  redirect("/lab/user");
}
