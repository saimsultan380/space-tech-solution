"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/lib/actions/profile";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      await resetPassword(password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse [animation-delay:2s]" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] animate-[fade-in_0.6s_ease-out]">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">Set new password</h2>
          <p className="mt-3 text-[15px] text-muted-foreground">Your new password must be different from previous ones.</p>
        </div>

        <div className="relative rounded-md border border-border bg-card/50 p-8 shadow-2xl backdrop-blur-xl">
          {success ? (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Password updated</h3>
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully reset. Redirecting to login...
                </p>
              </div>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full rounded-md">Return to login now</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-foreground/80 ml-1">
                  New Password
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

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground/80 ml-1">
                  Confirm Password
                </label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="flex h-13 w-full rounded-md border border-input bg-background/50 pl-11 pr-4 text-[15px] shadow-sm ring-offset-background transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

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
                {loading ? <Spinner /> : (
                  <div className="flex items-center justify-center gap-2">
                    Update password
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
