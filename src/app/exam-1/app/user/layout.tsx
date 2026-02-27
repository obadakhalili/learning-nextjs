import { getOwnProfileDTO } from "../_lib/users";
import { UserProvider } from "./_components/user-provider";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getOwnProfileDTO();
  return <UserProvider userPromise={user}>{children}</UserProvider>;
}
