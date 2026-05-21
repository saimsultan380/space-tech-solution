import { requireAuth } from "@/lib/auth";
import { getMyChannels } from "@/lib/actions/chat";
import { getUsers } from "@/lib/actions/users";
import { ChatClient } from "@/components/chat/chat-client";
import { unstable_cache } from "next/cache";
import type { AppUser } from "@/lib/types";

// PERFORMANCE: Cache the full user list for 5 minutes.
// Previously every chat page visit fetched 500 users from Supabase.
// With caching, 20 team members navigating to chat = 1 DB query (max) per 5 min.
const getCachedChatUsers = unstable_cache(
  async () => getUsers({ pageSize: 500 }),
  ["chat-users-list"],
  { revalidate: 300, tags: ["users"] }
);

export default async function ChatPage() {
  const user = await requireAuth();
  const [channels, usersResponse] = await Promise.all([
    getMyChannels(),
    getCachedChatUsers(),
  ]);

  return (
    <ChatClient
      channels={channels}
      currentUserId={user.id}
      currentUserName={user.full_name}
      currentUserRole={user.role}
      currentUserAvatar={user.avatar_url ?? null}
      allUsers={usersResponse.data.map((u: AppUser) => ({
        id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url ?? null,
        role: u.role,
        is_active: u.is_active,
      }))}
    />
  );
}
