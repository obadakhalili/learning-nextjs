import { getAdminProfileDTO } from "../_lib/users";

export default async function AdminPage() {
  const user = await getAdminProfileDTO();
  return <h1>{user?.name}</h1>;
}
