"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { ThemeColors } from "@/lib/actions/company-settings";
import { applyTailwindPrimaryFromHex } from "@/lib/theme-css";

const ThemeColorsContext = createContext<ThemeColors>({
  shell_bg_color: null,
  shell_text_color: null,
  sidebar_color: null,
  sidebar_text_color: null,
  button_color: null,
  button_text_color: null,
  active_tab_color: null,
  active_tab_text_color: null,
  chat_user_bubble_color: null,
  chat_user_bubble_text_color: null,
  chat_bot_bubble_color: null,
  chat_bot_bubble_text_color: null,
});

const VAR_MAP: Record<keyof ThemeColors, string> = {
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
};

export function ThemeColorsProvider({
  children,
  ...colors
}: ThemeColors & { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const style = root.style;
    for (const [key, cssVar] of Object.entries(VAR_MAP)) {
      const value = colors[key as keyof ThemeColors];
      if (value) {
        style.setProperty(cssVar, value);
      } else {
        style.removeProperty(cssVar);
      }
    }
    applyTailwindPrimaryFromHex(style, colors.button_color, colors.button_text_color);
    return () => {
      for (const cssVar of Object.values(VAR_MAP)) {
        style.removeProperty(cssVar);
      }
      style.removeProperty("--primary");
      style.removeProperty("--primary-foreground");
    };
  }, [
    colors.sidebar_color,
    colors.shell_bg_color,
    colors.shell_text_color,
    colors.sidebar_text_color,
    colors.button_color,
    colors.button_text_color,
    colors.active_tab_color,
    colors.active_tab_text_color,
    colors.chat_user_bubble_color,
    colors.chat_user_bubble_text_color,
    colors.chat_bot_bubble_color,
    colors.chat_bot_bubble_text_color,
  ]);

  return (
    <ThemeColorsContext.Provider value={colors}>
      {children}
    </ThemeColorsContext.Provider>
  );
}

export function useThemeColors() {
  return useContext(ThemeColorsContext);
}
