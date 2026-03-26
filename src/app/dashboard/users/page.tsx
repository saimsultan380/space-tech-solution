import { requireRole } from "@/lib/auth";
import { getUsers } from "@/lib/actions/users";
import { UsersClient } from "@/components/users/users-client";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  await requireRole(["super_admin"]);
  const page = Number(searchParams.page) || 1;
  const search = searchParams.q || "";

  const usersResponse = await getUsers({ page, pageSize: 10, search });

  return <UsersClient usersResponse={usersResponse} />;
}
