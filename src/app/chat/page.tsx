import { requireAuth } from "@/lib/auth";
import { getMyChannels } from "@/lib/actions/chat";
import { getUsers } from "@/lib/actions/users";
import { ChatClient } from "@/components/chat/chat-client";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

// PERFORMANCE: Cache the full user list for 5 minutes.
// Previously every chat page visit fetched 500 users from Supabase.
// With caching, 20 team members navigating to chat = 1 DB query (max) per 5 min.
const getCachedChatUsers = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id, full_name, avatar_url, role, is_active")
      .order("full_name", { ascending: true })
      .limit(500);

    if (error) throw new Error(error.message);
    return (data || []) as Array<{
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: UserRole;
      is_active: boolean;
    }>;
  },
  ["chat-users-list"],
  { revalidate: 300, tags: ["users"] }
);

export default async function ChatPage() {
  const user = await requireAuth();
  const [channels, usersResponse] = await Promise.all([
    getMyChannels(),
    process.env.SUPABASE_SERVICE_ROLE_KEY
      ? getCachedChatUsers()
      : getUsers({ pageSize: 500 }).then((res) => res.data),
  ]);

  return (
    <ChatClient
      channels={channels}
      currentUserId={user.id}
      currentUserName={user.full_name}
      currentUserRole={user.role}
      currentUserAvatar={user.avatar_url ?? null}
      allUsers={usersResponse.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url ?? null,
        role: u.role,
        is_active: u.is_active,
      }))}
    />
  );
}
