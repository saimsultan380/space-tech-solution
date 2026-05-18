"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { updateThemeColors, type CompanySettings } from "@/lib/actions/company-settings";
import { applyTailwindPrimaryFromHex } from "@/lib/theme-css";
import {
  RotateCcw,
  CheckCircle2,
  Save,
  PanelLeft,
  MousePointerClick,
  MessageSquare,
  LayoutGrid,
  Sparkles,
  Home,
  Users,
  BarChart3,
  Settings,
  Send,
} from "@/components/ui/icons";

interface ThemeAppearanceProps {
  companySettings: CompanySettings;
}

type ThemeFormState = {
  shell_bg_color: string;
  shell_text_color: string;
  sidebar_color: string;
  sidebar_text_color: string;
  button_color: string;
  button_text_color: string;
  active_tab_color: string;
  active_tab_text_color: string;
  chat_user_bubble_color: string;
  chat_user_bubble_text_color: string;
  chat_bot_bubble_color: string;
  chat_bot_bubble_text_color: string;
};

const CSS_VAR_MAP: Record<keyof ThemeFormState, string> = {
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

const DEFAULTS = {
  shell_bg_color: "#f8fafc",
  shell_text_color: "#0f172a",
  sidebar_color: "#3b82f6",
  sidebar_text_color: "#ffffff",
  button_color: "#2563eb",
  button_text_color: "#ffffff",
  active_tab_color: "#db8000",
  active_tab_text_color: "#f2f2f3",
  chat_user_bubble_color: "#3b82f6",
  chat_user_bubble_text_color: "#ffffff",
  chat_bot_bubble_color: "#f4f4f5",
  chat_bot_bubble_text_color: "#18181b",
};

function formFromSettings(cs: CompanySettings): ThemeFormState {
  return {
    shell_bg_color: cs.shell_bg_color ?? "",
    shell_text_color: cs.shell_text_color ?? "",
    sidebar_color: cs.sidebar_color ?? "",
    sidebar_text_color: cs.sidebar_text_color ?? "",
    button_color: cs.button_color ?? "",
    button_text_color: cs.button_text_color ?? "",
    active_tab_color: cs.active_tab_color ?? "",
    active_tab_text_color: cs.active_tab_text_color ?? "",
    chat_user_bubble_color: cs.chat_user_bubble_color ?? "",
    chat_user_bubble_text_color: cs.chat_user_bubble_text_color ?? "",
    chat_bot_bubble_color: cs.chat_bot_bubble_color ?? "",
    chat_bot_bubble_text_color: cs.chat_bot_bubble_text_color ?? "",
  };
}

export function ThemeAppearance({ companySettings }: ThemeAppearanceProps) {
  const router = useRouter();
  const [form, setForm] = useState<ThemeFormState>(() => formFromSettings(companySettings));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(formFromSettings(companySettings));

  useEffect(() => {
    const next = formFromSettings(companySettings);
    setForm(next);
    savedRef.current = next;
  }, [companySettings]);

  useEffect(() => {
    const style = document.documentElement.style;
    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
      const value = form[key as keyof ThemeFormState];
      if (value) {
        style.setProperty(cssVar, value);
      } else {
        style.removeProperty(cssVar);
      }
    }
    applyTailwindPrimaryFromHex(style, form.button_color || null, form.button_text_color || null);

    return () => {
      const saved = savedRef.current;
      for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
        const value = saved[key as keyof ThemeFormState];
        if (value) {
          style.setProperty(cssVar, value);
        } else {
          style.removeProperty(cssVar);
        }
      }
      applyTailwindPrimaryFromHex(style, saved.button_color || null, saved.button_text_color || null);
    };
  }, [form]);

  const set = (key: keyof ThemeFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetSection = (keys: (keyof ThemeFormState)[]) =>
    setForm((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = "";
      return next;
    });

  const resetAll = () =>
    setForm({
      shell_bg_color: "",
      shell_text_color: "",
      sidebar_color: "",
      sidebar_text_color: "",
      button_color: "",
      button_text_color: "",
      active_tab_color: "",
      active_tab_text_color: "",
      chat_user_bubble_color: "",
      chat_user_bubble_text_color: "",
      chat_bot_bubble_color: "",
      chat_bot_bubble_text_color: "",
    });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await updateThemeColors({
        shell_bg_color: form.shell_bg_color || null,
        shell_text_color: form.shell_text_color || null,
        sidebar_color: form.sidebar_color || null,
        sidebar_text_color: form.sidebar_text_color || null,
        button_color: form.button_color || null,
        button_text_color: form.button_text_color || null,
        active_tab_color: form.active_tab_color || null,
        active_tab_text_color: form.active_tab_text_color || null,
        chat_user_bubble_color: form.chat_user_bubble_color || null,
        chat_user_bubble_text_color: form.chat_user_bubble_text_color || null,
        chat_bot_bubble_color: form.chat_bot_bubble_color || null,
        chat_bot_bubble_text_color: form.chat_bot_bubble_text_color || null,
      });
      savedRef.current = { ...form };
      setMessage("Theme colors saved successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme colors.");
    } finally {
      setLoading(false);
    }
  };

  const resolve = (key: keyof ThemeFormState) =>
    form[key] || DEFAULTS[key];

  return (
    <form onSubmit={handleSave}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Theme Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Customize your app&apos;s visual identity. Changes preview instantly across the UI.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          {/* Left: Controls */}
          <div className="space-y-5">
            {/* Sidebar Active Item */}
            <ColorSection
              icon={<PanelLeft className="h-4 w-4" />}
              title="Sidebar + Header Surface"
              description="Background and base text color shared by sidebar and top header"
              onReset={() => resetSection(["shell_bg_color", "shell_text_color"])}
            >
              <ColorField
                id="shell_bg_color"
                label="Background"
                value={form.shell_bg_color}
                fallback={DEFAULTS.shell_bg_color}
                onChange={(v) => set("shell_bg_color", v)}
              />
              <ColorField
                id="shell_text_color"
                label="Text"
                value={form.shell_text_color}
                fallback={DEFAULTS.shell_text_color}
                onChange={(v) => set("shell_text_color", v)}
              />
            </ColorSection>

            {/* Sidebar Active Item */}
            <ColorSection
              icon={<PanelLeft className="h-4 w-4" />}
              title="Sidebar Active Item"
              description="Active navigation highlight in the sidebar"
              onReset={() => resetSection(["sidebar_color", "sidebar_text_color"])}
            >
              <ColorField
                id="sidebar_color"
                label="Background"
                value={form.sidebar_color}
                fallback={DEFAULTS.sidebar_color}
                onChange={(v) => set("sidebar_color", v)}
              />
              <ColorField
                id="sidebar_text_color"
                label="Text"
                value={form.sidebar_text_color}
                fallback={DEFAULTS.sidebar_text_color}
                onChange={(v) => set("sidebar_text_color", v)}
              />
            </ColorSection>

            {/* Primary Buttons */}
            <ColorSection
              icon={<MousePointerClick className="h-4 w-4" />}
              title="Primary Buttons"
              description="Call-to-action buttons and primary accents"
              onReset={() => resetSection(["button_color", "button_text_color"])}
            >
              <ColorField
                id="button_color"
                label="Background"
                value={form.button_color}
                fallback={DEFAULTS.button_color}
                onChange={(v) => set("button_color", v)}
              />
              <ColorField
                id="button_text_color"
                label="Text"
                value={form.button_text_color}
                fallback={DEFAULTS.button_text_color}
                onChange={(v) => set("button_text_color", v)}
              />
            </ColorSection>

            {/* Active Tabs */}
            <ColorSection
              icon={<LayoutGrid className="h-4 w-4" />}
              title="Active Tabs"
              description="Selected tab indicator throughout the app"
              onReset={() => resetSection(["active_tab_color", "active_tab_text_color"])}
            >
              <ColorField
                id="active_tab_color"
                label="Background"
                value={form.active_tab_color}
                fallback={DEFAULTS.active_tab_color}
                onChange={(v) => set("active_tab_color", v)}
              />
              <ColorField
                id="active_tab_text_color"
                label="Text"
                value={form.active_tab_text_color}
                fallback={DEFAULTS.active_tab_text_color}
                onChange={(v) => set("active_tab_text_color", v)}
              />
            </ColorSection>

            {/* Chat Bubbles */}
            <ColorSection
              icon={<MessageSquare className="h-4 w-4" />}
              title="Chat Bubbles"
              description="Customize user and bot message bubble colors"
              onReset={() =>
                resetSection([
                  "chat_user_bubble_color",
                  "chat_user_bubble_text_color",
                  "chat_bot_bubble_color",
                  "chat_bot_bubble_text_color",
                ])
              }
            >
              <div className="col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Messages
                </p>
              </div>
              <ColorField
                id="chat_user_bubble_color"
                label="Bubble Color"
                value={form.chat_user_bubble_color}
                fallback={DEFAULTS.chat_user_bubble_color}
                onChange={(v) => set("chat_user_bubble_color", v)}
              />
              <ColorField
                id="chat_user_bubble_text_color"
                label="Text Color"
                value={form.chat_user_bubble_text_color}
                fallback={DEFAULTS.chat_user_bubble_text_color}
                onChange={(v) => set("chat_user_bubble_text_color", v)}
              />
              <div className="col-span-2 mt-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Other Messages
                </p>
              </div>
              <ColorField
                id="chat_bot_bubble_color"
                label="Bubble Color"
                value={form.chat_bot_bubble_color}
                fallback={DEFAULTS.chat_bot_bubble_color}
                onChange={(v) => set("chat_bot_bubble_color", v)}
              />
              <ColorField
                id="chat_bot_bubble_text_color"
                label="Text Color"
                value={form.chat_bot_bubble_text_color}
                fallback={DEFAULTS.chat_bot_bubble_text_color}
                onChange={(v) => set("chat_bot_bubble_text_color", v)}
              />
            </ColorSection>
          </div>

          {/* Right: Live Preview */}
          <div className="xl:sticky xl:top-6 space-y-4 self-start">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Live Preview
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {/* Header + Sidebar surface preview */}
              <div
                className="border-b border-border p-3"
                style={{
                  backgroundColor: resolve("shell_bg_color"),
                  color: resolve("shell_text_color"),
                }}
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-70">
                  Header + Sidebar Surface
                </p>
                <div className="mb-3 flex items-center justify-between rounded-lg border border-border/50 bg-black/[0.02] px-3 py-2 text-xs">
                  <span className="font-semibold">Top Header</span>
                  <span className="opacity-70">Notifications • Profile</span>
                </div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Sidebar
                </p>
                <div className="space-y-1">
                  {[
                    { icon: <Home className="h-3.5 w-3.5" />, label: "Dashboard", active: false },
                    { icon: <Users className="h-3.5 w-3.5" />, label: "Leads", active: true },
                    { icon: <BarChart3 className="h-3.5 w-3.5" />, label: "Sales", active: false },
                    { icon: <Settings className="h-3.5 w-3.5" />, label: "Settings", active: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={
                        item.active
                          ? {
                              backgroundColor: resolve("sidebar_color"),
                              color: resolve("sidebar_text_color"),
                            }
                          : { color: resolve("shell_text_color") }
                      }
                    >
                      {item.icon}
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons preview */}
              <div className="border-b border-border p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Buttons
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-xs font-semibold shadow-md shadow-primary/25 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: resolve("button_color"),
                      color: resolve("button_text_color"),
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-xs font-semibold shadow-md shadow-primary/25 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: resolve("button_color"),
                      color: resolve("button_text_color"),
                    }}
                  >
                    Create New
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Tabs preview */}
              <div className="border-b border-border p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tabs
                </p>
                <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                  {["Overview", "Analytics", "Reports"].map((tab, i) => (
                    <div
                      key={tab}
                      className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                      style={
                        i === 0
                          ? {
                              backgroundColor: resolve("active_tab_color"),
                              color: resolve("active_tab_text_color"),
                            }
                          : { color: "hsl(var(--muted-foreground))" }
                      }
                    >
                      {tab}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat preview */}
              <div className="p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Chat
                </p>
                <div className="space-y-2 rounded-lg border border-border/50 bg-background p-3">
                  {/* Bot message */}
                  <div className="flex justify-start">
                    <div
                      className="max-w-[80%] rounded-2xl rounded-bl-sm px-3 py-2 text-xs shadow-sm"
                      style={{
                        backgroundColor: resolve("chat_bot_bubble_color"),
                        color: resolve("chat_bot_bubble_text_color"),
                      }}
                    >
                      Hello! How can I help you today?
                    </div>
                  </div>
                  {/* User message */}
                  <div className="flex justify-end">
                    <div
                      className="max-w-[80%] rounded-2xl rounded-br-sm px-3 py-2 text-xs shadow-sm"
                      style={{
                        backgroundColor: resolve("chat_user_bubble_color"),
                        color: resolve("chat_user_bubble_text_color"),
                      }}
                    >
                      I need help with my account settings.
                    </div>
                  </div>
                  {/* Bot message */}
                  <div className="flex justify-start">
                    <div
                      className="max-w-[80%] rounded-2xl rounded-bl-sm px-3 py-2 text-xs shadow-sm"
                      style={{
                        backgroundColor: resolve("chat_bot_bubble_color"),
                        color: resolve("chat_bot_bubble_text_color"),
                      }}
                    >
                      Sure, I&apos;d be happy to assist!
                    </div>
                  </div>
                  {/* User message */}
                  <div className="flex justify-end">
                    <div
                      className="max-w-[80%] rounded-2xl rounded-br-sm px-3 py-2 text-xs shadow-sm"
                      style={{
                        backgroundColor: resolve("chat_user_bubble_color"),
                        color: resolve("chat_user_bubble_text_color"),
                      }}
                    >
                      Thank you!
                    </div>
                  </div>
                  {/* Input bar */}
                  <div className="mt-2 flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5">
                    <span className="flex-1 text-[10px] text-muted-foreground">
                      Type a message...
                    </span>
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: resolve("button_color"),
                        color: resolve("button_text_color"),
                      }}
                    >
                      <Send className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status messages */}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && !error && (
          <p className="text-sm text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </p>
        )}

        {/* Action row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto gap-2">
            {loading ? <Spinner /> : <Save className="h-4 w-4" />}
            Save Theme Colors
          </Button>
          <Button type="button" variant="outline" className="w-full sm:w-auto gap-2" onClick={resetAll}>
            <RotateCcw className="h-4 w-4" />
            Reset All to Defaults
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ---------- Sub-components ---------- */

function ColorSection({
  icon,
  title,
  description,
  onReset,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">{title}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  fallback,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30">
        <div className="relative">
          <input
            type="color"
            id={id}
            value={value || fallback}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className="h-8 w-8 shrink-0 rounded-md border border-border/60 shadow-inner"
            style={{ backgroundColor: value || fallback }}
          />
        </div>
        <input
          type="text"
          placeholder={fallback}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="h-8 w-full min-w-0 bg-transparent px-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
