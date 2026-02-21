"use server";

interface LoginFormState {
  success: boolean;
  message: string;
}

const users = [{ name: "obada", password: "1234" }];

export async function login(state: LoginFormState, formData: FormData) {
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;

  const user = users.find(
    (user) => user.name === name && user.password === password,
  );

  if (!user) {
    return { success: false, message: "Invalid name or password" };
  }

  return { success: true, message: `Welcome, ${user.name}!` };
}
