import { Suspense } from "react";
import { getOwnProfileDTO } from "../_lib/users";
import { UserInfo } from "./_components/user-info";

export default async function UserPage() {
  const user = await getOwnProfileDTO();
  return (
    <div>
      <h1>{user?.name}</h1>
      <Suspense fallback={<h1>Loading...</h1>}>
        <UserInfo />
      </Suspense>
    </div>
  );
}
