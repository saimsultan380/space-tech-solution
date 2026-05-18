"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";

type PageState = "verifying" | "ready" | "success" | "invalid";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>("verifying");
  const router = useRouter();

  // ── Exchange the token/code from the email link ──────────────
  useEffect(() => {
    const exchangeToken = async () => {
      const supabase = createClient();

      // Supabase PKCE flow sends ?code=... as a query param
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setPageState("invalid");
        } else {
          setPageState("ready");
        }
        return;
      }

      // Implicit flow: token arrives in the URL hash fragment (#access_token=...)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        // The Supabase client auto-detects hash tokens on getSession()
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          setPageState("invalid");
        } else {
          setPageState("ready");
        }
        return;
      }

      // No token at all — invalid link
      setPageState("invalid");
    };

    exchangeToken();
  }, []);

  // ── Submit new password ───────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPageState("success");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Shared page shell ─────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-[fade-in_0.6s_ease-out]">

        {/* ── Verifying ── */}
        {pageState === "verifying" && (
          <div className="text-center space-y-4">
            <Spinner />
            <p className="text-sm text-muted-foreground">Verifying reset link…</p>
          </div>
        )}

        {/* ── Invalid / expired link ── */}
        {pageState === "invalid" && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Link expired</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This password reset link is invalid or has already been used.
                <br />Please request a new one.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-lg space-y-3">
              <Link href="/forgot-password">
                <Button className="w-full rounded-lg font-semibold">
                  Request new reset link
                </Button>
              </Link>
              <Link
                href="/login"
                className="flex justify-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Back to login
              </Link>
            </div>
          </>
        )}

        {/* ── Success ── */}
        {pageState === "success" && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Password updated!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your password has been successfully changed.
                <br />Redirecting you to login…
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
              <Link href="/login">
                <Button className="w-full rounded-lg font-semibold">
                  Go to login now
                </Button>
              </Link>
            </div>
          </>
        )}

        {/* ── Ready — show the form ── */}
        {pageState === "ready" && (
          <>
            <div className="mb-7">
              <h2 className="text-[1.75rem] font-bold tracking-tight">
                Set new password
              </h2>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Your new password must be at least 8 characters.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-lg shadow-black/5 dark:shadow-black/30">
              <form onSubmit={handleSubmit} className="flex flex-col gap-0">

                {/* New password */}
                <div className="p-5 pb-0 space-y-1.5">
                  <label htmlFor="password" className="text-[13px] font-semibold text-foreground/75">
                    New Password
                  </label>
                  <div className="group relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="h-10 w-full rounded-lg border border-input bg-background/60 pl-10 pr-11 text-sm transition-all placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="p-5 pt-4 space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-[13px] font-semibold text-foreground/75">
                    Confirm Password
                  </label>
                  <div className="group relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="h-10 w-full rounded-lg border border-input bg-background/60 pl-10 pr-11 text-sm transition-all placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mx-5 mb-1 flex items-center gap-2.5 rounded-lg bg-destructive/5 border border-destructive/20 px-3.5 py-2.5 text-[13px] text-destructive animate-in fade-in zoom-in duration-300">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <p className="font-medium">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <div className="p-5 pt-3">
                  <Button
                    type="submit"
                    className="group h-10 w-full rounded-lg text-[14px] font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <Spinner />
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        Update password
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    )}
                  </Button>
                </div>

              </form>
            </div>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground/60">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              Secured with enterprise-grade encryption
            </div>
          </>
        )}

      </div>
    </div>
  );
}
