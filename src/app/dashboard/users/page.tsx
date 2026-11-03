import { requireRole } from "@/lib/auth";
import { getUsers } from "@/lib/actions/users";
import { UsersClient } from "@/components/users/users-client";
import { parsePageSize } from "@/lib/page-size";

export default async function UsersPage(props: {
  searchParams: Promise<{ page?: string; q?: string; pageSize?: string }>;
}) {
  await requireRole(["super_admin"]);
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.q || "";
  const pageSize = parsePageSize(searchParams.pageSize);

  const usersResponse = await getUsers({ page, pageSize, search });

  return <UsersClient usersResponse={usersResponse} />;
}
