import { requireAuth } from "@/lib/auth";
import { getMyChannels } from "@/lib/actions/chat";
import { getUsers } from "@/lib/actions/users";
import { ChatClient } from "@/components/chat/chat-client";

export default async function ChatPage() {
  const user = await requireAuth();
  const [channels, usersResponse] = await Promise.all([
    getMyChannels(),
    getUsers({ pageSize: 500 }),
  ]);

  return (
    <ChatClient
      channels={channels}
      currentUserId={user.id}
      currentUserName={user.full_name}
      currentUserRole={user.role}
      currentUserAvatar={user.avatar_url ?? null}
      allUsers={usersResponse.data.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url ?? null,
        role: u.role,
        is_active: u.is_active,
      }))}
    />
  );
}
