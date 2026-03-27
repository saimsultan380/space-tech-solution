import { requireAuth } from "@/lib/auth";
import { getAllLeaves, getLeavesForCurrentUser } from "@/lib/actions/leaves";
import { LeavesAdminClient } from "@/components/leaves/leaves-admin-client";
import { MyLeavesClient } from "@/components/leaves/my-leaves-client";

export default async function LeavesPage(props: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const user = await requireAuth();
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const status = (searchParams.status as any) || "all";

  if (user.role === "super_admin") {
    const leavesResponse = await getAllLeaves({ page, pageSize: 10, status });
    return <LeavesAdminClient leavesResponse={leavesResponse} />;
  }

  const leavesResponse = await getLeavesForCurrentUser({ page, pageSize: 10, status });
  return <MyLeavesClient leavesResponse={leavesResponse} userRole={user.role} />;
}

