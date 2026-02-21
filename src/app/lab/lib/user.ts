import { cookies } from "next/headers";
import { cache } from "react";
import { decrypt } from "./session";
import { users } from "../data";

export const getUser = cache(async () => {
  const payload = (await cookies()).get("session")?.value;
  if (!payload) return null;
  const user = decrypt(payload);

  if (!user || !users.find((u) => u.name === user.userId)) {
    return null;
  }

  return { id: user.userId };
});
