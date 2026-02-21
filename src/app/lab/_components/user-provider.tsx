"use client";

import { createContext } from "react";

type User = {
  id: string;
};

export const UserContext = createContext<Promise<User | null>>(
  Promise.resolve(null),
);

export default function UserProvider({
  children,
  userPromise,
}: {
  children: React.ReactNode;
  userPromise: Promise<User | null>;
}) {
  return <UserContext value={userPromise}>{children}</UserContext>;
}
