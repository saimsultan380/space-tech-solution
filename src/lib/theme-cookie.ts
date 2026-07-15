import type { ThemeColors } from "@/lib/actions/company-settings";

export const THEME_COOKIE_NAME = "crm-theme-colors";

const EMPTY_THEME: ThemeColors = {
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
};

const THEME_KEYS = Object.keys(EMPTY_THEME) as (keyof ThemeColors)[];

export function emptyThemeColors(): ThemeColors {
  return { ...EMPTY_THEME };
}

export function pickThemeColors(
  source: Partial<ThemeColors> | null | undefined,
): ThemeColors {
  const next = emptyThemeColors();
  if (!source) return next;
  for (const key of THEME_KEYS) {
    const value = source[key];
    next[key] = typeof value === "string" && value.trim() ? value : null;
  }
  return next;
}

export function serializeThemeColors(theme: ThemeColors): string {
  return JSON.stringify(pickThemeColors(theme));
}

export function parseThemeColors(raw: string | undefined | null): ThemeColors | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemeColors>;
    if (!parsed || typeof parsed !== "object") return null;
    return pickThemeColors(parsed);
  } catch {
    return null;
  }
}

/** Client-side cookie write so theme survives navigations without blocking layout. */
export function writeThemeCookieClient(theme: ThemeColors): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(serializeThemeColors(theme));
  document.cookie = `${THEME_COOKIE_NAME}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
