"use client"

import { use, useContext } from "react";
import { UserContext } from "../_components/user-provider";

export default function ProtectedPage() {
  const userContext = useContext(UserContext)
  const id = use(userContext)?.id

  return (
    <div>
      <h1>Protected Page</h1>
      {id && <p>User ID: {id}</p>}
    </div>
  );
}
