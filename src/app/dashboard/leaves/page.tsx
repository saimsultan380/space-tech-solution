import { requireAuth } from "@/lib/auth";
import { getAllLeaves, getLeavesForCurrentUser } from "@/lib/actions/leaves";
import { LeavesAdminClient } from "@/components/leaves/leaves-admin-client";
import { MyLeavesClient } from "@/components/leaves/my-leaves-client";

export default async function LeavesPage() {
  const user = await requireAuth();

  if (user.role === "super_admin") {
    const leaves = await getAllLeaves();
    return <LeavesAdminClient leaves={leaves} />;
  }

  const leaves = await getLeavesForCurrentUser();
  return <MyLeavesClient leaves={leaves} userRole={user.role} />;
}

