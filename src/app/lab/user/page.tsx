"use client";

import { use, useContext } from "react";
import { UserContext } from "../_components/user-provider";

export default function UserPage() {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("UserContext is not provided");
  }
  const { id, name } = use(user);
  return (
    <h1>
      user: {name} ({id})
    </h1>
  );
}
