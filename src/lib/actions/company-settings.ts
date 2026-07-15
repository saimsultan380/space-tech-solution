"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache";

export type CompanySettings = {
  company_name: string;
  address_line: string;
  contact_email: string;
  logo_url: string | null;
  shell_bg_color: string | null;
  shell_text_color: string | null;
  sidebar_color: string | null;
  sidebar_text_color: string | null;
  button_color: string | null;
  button_text_color: string | null;
  active_tab_color: string | null;
  active_tab_text_color: string | null;
  chat_user_bubble_color: string | null;
  chat_user_bubble_text_color: string | null;
  chat_bot_bubble_color: string | null;
  chat_bot_bubble_text_color: string | null;
};

export type ThemeColors = Pick<
  CompanySettings,
  | "shell_bg_color"
  | "shell_text_color"
  | "sidebar_color"
  | "sidebar_text_color"
  | "button_color"
  | "button_text_color"
  | "active_tab_color"
  | "active_tab_text_color"
  | "chat_user_bubble_color"
  | "chat_user_bubble_text_color"
  | "chat_bot_bubble_color"
  | "chat_bot_bubble_text_color"
>;

export const getCompanySettings = unstable_cache(
  async (): Promise<CompanySettings> => {
    // Note: We cannot use requireAuth inside unstable_cache if it relies on headers/cookies 
    // unless we pass the user context in. For global settings, we usually don't need auth 
    // inside the cache function if the data is public-ish or safe.
    // However, since we want to ensure only authorized users trigger the fetch:
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("company_settings")
      .select("company_name, address_line, contact_email, logo_url, shell_bg_color, shell_text_color, sidebar_color, sidebar_text_color, button_color, button_text_color, active_tab_color, active_tab_text_color, chat_user_bubble_color, chat_user_bubble_text_color, chat_bot_bubble_color, chat_bot_bubble_text_color")
      .eq("id", 1)
      .single();

    if (error) throw new Error(error.message);
    return {
      company_name: data.company_name,
      address_line: data.address_line,
      contact_email: data.contact_email,
      logo_url: data.logo_url ?? null,
      shell_bg_color: data.shell_bg_color ?? null,
      shell_text_color: data.shell_text_color ?? null,
      sidebar_color: data.sidebar_color ?? null,
      sidebar_text_color: data.sidebar_text_color ?? null,
      button_color: data.button_color ?? null,
      button_text_color: data.button_text_color ?? null,
      active_tab_color: data.active_tab_color ?? null,
      active_tab_text_color: data.active_tab_text_color ?? null,
      chat_user_bubble_color: data.chat_user_bubble_color ?? null,
      chat_user_bubble_text_color: data.chat_user_bubble_text_color ?? null,
      chat_bot_bubble_color: data.chat_bot_bubble_color ?? null,
      chat_bot_bubble_text_color: data.chat_bot_bubble_text_color ?? null,
    };
  },
  ["company-settings"],
  { revalidate: 3600, tags: ["settings", "company-settings"] }
);

type BrandingInput = Pick<CompanySettings, "company_name" | "address_line" | "contact_email" | "logo_url">;

export async function updateCompanySettings(input: BrandingInput) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_settings")
    .update({
      company_name: input.company_name,
      address_line: input.address_line,
      contact_email: input.contact_email,
      logo_url: input.logo_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) throw new Error(error.message);
  (revalidateTag as any)("company-settings");
  revalidatePath("/dashboard/settings");
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
function validHex(v: string | null): string | null {
  if (!v) return null;
  return HEX_RE.test(v) ? v : null;
}

export async function updateThemeColors(input: ThemeColors) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const payload = {
    shell_bg_color: validHex(input.shell_bg_color),
    shell_text_color: validHex(input.shell_text_color),
    sidebar_color: validHex(input.sidebar_color),
    sidebar_text_color: validHex(input.sidebar_text_color),
    button_color: validHex(input.button_color),
    button_text_color: validHex(input.button_text_color),
    active_tab_color: validHex(input.active_tab_color),
    active_tab_text_color: validHex(input.active_tab_text_color),
    chat_user_bubble_color: validHex(input.chat_user_bubble_color),
    chat_user_bubble_text_color: validHex(input.chat_user_bubble_text_color),
    chat_bot_bubble_color: validHex(input.chat_bot_bubble_color),
    chat_bot_bubble_text_color: validHex(input.chat_bot_bubble_text_color),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("company_settings")
    .update(payload)
    .eq("id", 1);

  if (error) throw new Error(error.message);

  const { cookies } = await import("next/headers");
  const { serializeThemeColors, THEME_COOKIE_NAME, pickThemeColors } =
    await import("@/lib/theme-cookie");
  const jar = await cookies();
  jar.set(THEME_COOKIE_NAME, serializeThemeColors(pickThemeColors(payload)), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  (revalidateTag as any)("company-settings");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/chat", "layout");
}

