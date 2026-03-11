import { requireRole } from "@/lib/auth";
import { getUsers } from "@/lib/actions/users";
import { UsersClient } from "@/components/users/users-client";

export default async function UsersPage() {
  await requireRole(["super_admin"]);
  const users = await getUsers();

  return <UsersClient users={users} />;
}
