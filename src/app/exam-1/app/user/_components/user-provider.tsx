"use client";

import { createContext } from "react";

type User = Promise<
  | {
      name: string;
      isAdmin: boolean;
    }
  | undefined
>;

export const UserContext = createContext<User | null>(null);

export function UserProvider({
  children,
  userPromise,
}: {
  children: React.ReactNode;
  userPromise: User;
}) {
  return (
    <UserContext.Provider value={userPromise}>{children}</UserContext.Provider>
  );
}
