import { getOwnProfileDTO } from "../_lib/users";

export default async function UserPage() {
  const user = await getOwnProfileDTO();
  return <h1>{user?.name}</h1>;
}
