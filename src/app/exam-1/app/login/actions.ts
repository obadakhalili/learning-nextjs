"use server";

import { redirect } from "next/navigation";
import { createUserSession, users } from "../_lib/users";

interface LoginFormState {
  error?: string;
}

export async function login(formState: LoginFormState, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );
  if (!user) {
    return Promise.resolve({ error: "Invalid username or password" });
  }
  await createUserSession(username);
  redirect("/exam-1/app/user");
}
