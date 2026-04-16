"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { ThemeColors } from "@/lib/actions/company-settings";

const ThemeColorsContext = createContext<ThemeColors>({
  sidebar_color: null,
  sidebar_text_color: null,
  button_color: null,
  button_text_color: null,
  active_tab_color: null,
  active_tab_text_color: null,
});

const VAR_MAP: Record<keyof ThemeColors, string> = {
  sidebar_color: "--theme-sidebar-color",
  sidebar_text_color: "--theme-sidebar-text-color",
  button_color: "--theme-button-color",
  button_text_color: "--theme-button-text-color",
  active_tab_color: "--theme-active-tab-color",
  active_tab_text_color: "--theme-active-tab-text-color",
};

export function ThemeColorsProvider({
  children,
  ...colors
}: ThemeColors & { children: ReactNode }) {
  useEffect(() => {
    const style = document.body.style;
    for (const [key, cssVar] of Object.entries(VAR_MAP)) {
      const value = colors[key as keyof ThemeColors];
      if (value) {
        style.setProperty(cssVar, value);
      } else {
        style.removeProperty(cssVar);
      }
    }
    return () => {
      for (const cssVar of Object.values(VAR_MAP)) {
        style.removeProperty(cssVar);
      }
    };
  }, [
    colors.sidebar_color,
    colors.sidebar_text_color,
    colors.button_color,
    colors.button_text_color,
    colors.active_tab_color,
    colors.active_tab_text_color,
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
