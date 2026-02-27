"use client";

import { use, useContext } from "react";
import { UserContext } from "./user-provider";

export function UserInfo() {
  const userPromise = useContext(UserContext);
  const user = use(userPromise!);
  return <h1>from client component: {user?.name}</h1>;
}
