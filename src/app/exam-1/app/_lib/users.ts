import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

export const users = [
  {
    username: "obada",
    password: "password123",
    profile: {
      name: "Obada Khalili",
      isAdmin: true,
    },
  },
  {
    username: "john",
    password: "password456",
    profile: {
      name: "John Doe",
      isAdmin: false,
    },
  },
];

export async function createUserSession(username: string) {
  const cookiesStore = await cookies();
  cookiesStore.set("user", username, { path: "/" });
}

export async function verifyUserSession() {
  const cookiesStore = await cookies();
  const username = cookiesStore.get("user")?.value;
  if (!username) {
    redirect("/exam-1/app/login");
  }
  const user = users.find((u) => u.username === username);
  if (!user) {
    cookiesStore.delete("user");
    redirect("/exam-1/app/login");
  }
  return user.username;
}

export const getUser = React.cache(async () => {
  const username = await verifyUserSession();
  return users.find((u) => u.username === username);
});

export async function getOwnProfileDTO() {
  const user = await getUser();
  return user?.profile;
}

export async function getAdminProfileDTO() {
  const user = await getUser();
  if (!user?.profile.isAdmin) {
    redirect("/exam-1/app/user");
  }
  return user.profile;
}
