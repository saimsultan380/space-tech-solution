"use client";

import { useQuery } from "@tanstack/react-query";
import { getCompanySettings } from "@/lib/queries/analytics";
import {
  pickThemeColors,
  writeThemeCookieClient,
} from "@/lib/theme-cookie";
import { applyTailwindPrimaryFromHex } from "@/lib/theme-css";

const VAR_MAP = {
  shell_bg_color: "--theme-shell-bg-color",
  shell_text_color: "--theme-shell-text-color",
  sidebar_color: "--theme-sidebar-color",
  sidebar_text_color: "--theme-sidebar-text-color",
  button_color: "--theme-button-color",
  button_text_color: "--theme-button-text-color",
  active_tab_color: "--theme-active-tab-color",
  active_tab_text_color: "--theme-active-tab-text-color",
  chat_user_bubble_color: "--theme-chat-user-bg",
  chat_user_bubble_text_color: "--theme-chat-user-text",
  chat_bot_bubble_color: "--theme-chat-bot-bg",
  chat_bot_bubble_text_color: "--theme-chat-bot-text",
} as const;

/** Background theme refresh for /chat (layout no longer awaits company_settings). */
export function ChatThemeHydrator() {
  useQuery({
    queryKey: ["company-settings-theme"],
    queryFn: async () => {
      const settings = await getCompanySettings();
      const theme = pickThemeColors(settings);
      writeThemeCookieClient(theme);

      const root = document.documentElement.style;
      for (const [key, cssVar] of Object.entries(VAR_MAP)) {
        const value = theme[key as keyof typeof theme];
        if (value) root.setProperty(cssVar, value);
        else root.removeProperty(cssVar);
      }
      applyTailwindPrimaryFromHex(
        root,
        theme.button_color,
        theme.button_text_color,
      );
      return theme;
    },
    staleTime: 60 * 60 * 1000,
  });

  return null;
}
