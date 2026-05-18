"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "@/components/ui/icons";
import { createDirectMessage } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageButtonProps {
  userId: string;
  userName: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function MessageButton({
  userId,
  userName,
  className,
  variant = "ghost",
  size = "sm",
  showLabel = false,
}: MessageButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMessage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    try {
      const result = await createDirectMessage(userId);
      if (result.error) {
        console.error("Failed to create DM:", result.error);
        return;
      }
      
      if (result.channelId) {
        // Redirect to chat with the new channel active
        router.push(`/chat?channelId=${result.channelId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleMessage}
      disabled={loading}
      className={cn("gap-2", className)}
      title={`Message ${userName}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      {showLabel && (loading ? "Connecting..." : "Message")}
    </Button>
  );
}
