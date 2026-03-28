"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loading";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("inactive") === "1") {
      setNotice(
        "Your account is inactive. It was deactivated by an administrator. Please contact admin to reactivate it.",
      );
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If auth succeeded but the profile is inactive, immediately sign out and show a clear notice.
    try {
      const userId = authData.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("users")
          .select("is_active")
          .eq("id", userId)
          .single();

        if (profile?.is_active === false) {
          await supabase.auth.signOut();
          setNotice(
            "Your account is inactive. It was deactivated by an administrator. Please contact admin to reactivate it.",
          );
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore and continue to dashboard (middleware/requireAuth will still enforce)
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      {/* Dynamic Background Elements (Visible on all screens) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute left-[20%] top-[30%] h-32 w-32 rounded-full bg-purple-500/5 blur-[60px]" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Left side - branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5 border-r border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-blue-600/10" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM4MDgwODAiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

        <div className="relative z-10 flex flex-col justify-between p-16 text-foreground">
          <div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Space Tech Solution
              </span>
            </div>
          </div>

          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Enterprise CRM Platform
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight xl:text-6xl">
              Manage your <span className="text-primary">sales,</span>
              <br />
              <span className="text-blue-600">billing</span> & team
              <br />
              in one place.
            </h1>

            <p className="max-w-md text-lg text-muted-foreground leading-relaxed">
              A powerful internal CRM to track sales pipelines, process billing,
              manage chargebacks, and monitor team performance with real-time
              analytics.
            </p>

            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border">
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight text-primary">
                  99.9%
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Uptime
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight text-blue-600">
                  50K+
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Processed
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight text-emerald-600">
                  3x
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Efficiency
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Secured with enterprise-grade encryption
          </div>
        </div>

        {/* Decorative elements for desktop */}
        <div className="absolute -right-24 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -left-12 bottom-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      {/* Right side - login form */}
      <div className="relative z-10 flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-[440px] animate-[fade-in_0.6s_ease-out]">
          {/* Mobile Logo */}
          <div className="mb-12 flex flex-col items-center text-center lg:hidden"></div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Welcome Back
            </h2>
            <p className="mt-3 text-[15px] text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <div className="relative rounded-md border border-border bg-card/50 p-8 shadow-2xl backdrop-blur-xl lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-foreground/80 ml-1"
                >
                  Email address
                </label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex h-13 w-full rounded-md border border-input bg-background/50 pl-11 pr-4 text-[15px] shadow-sm ring-offset-background transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-foreground/80 ml-1"
                >
                  Password
                </label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex h-13 w-full rounded-md border border-input bg-background/50 pl-11 pr-4 text-[15px] shadow-sm ring-offset-background transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {notice && (
                <div className="flex items-center gap-3 rounded-md bg-destructive/5 border border-destructive/30 px-4 py-3 text-[14px] text-destructive animate-in fade-in zoom-in duration-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="font-medium">{notice}</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 rounded-md bg-destructive/5 border border-destructive/20 px-4 py-3 text-[14px] text-destructive animate-in fade-in zoom-in duration-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="group h-13 w-full rounded-md text-[16px] font-bold shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <Spinner />
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-10 flex flex-col items-center gap-4 lg:hidden">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
              <p className="text-sm text-muted-foreground">
                Secured by Space Tech Solution
              </p>
            </div>
          </div>

          <p className="mt-10 text-center text-[13px] font-medium text-muted-foreground/80">
            Forgot password?{" "}
            <Link href="/forgot-password">
              <span className="text-primary hover:underline">
                Reset it here
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
