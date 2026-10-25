import { redirect } from "next/navigation";

export default async function ChatRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.channelId;
  const channelId = Array.isArray(raw) ? raw[0] : raw;
  redirect(
    channelId
      ? `/dashboard/chat?channelId=${encodeURIComponent(channelId)}`
      : "/dashboard/chat",
  );
}
