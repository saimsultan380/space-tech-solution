"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

import LoginPageComponent from "@/components/ui/login-portal";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("inactive") === "1") {
      setError("Your session has expired. Please sign in again.");
    }
  }, []);

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    setLoading(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

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
          setError("Invalid email or password");
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore and continue
    }

    setSuccess(true);
    // Add a small delay for the success animation to show
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 800);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12 bg-slate-950">
      <LoginPageComponent.VideoBackground videoUrl="/login-bg-video.mp4" />

      <div className="relative z-20 w-full max-w-md animate-fadeIn">
        <LoginPageComponent.LoginForm
          onSubmit={handleLogin}
          isSubmitting={loading}
          isSuccess={success}
          error={error}
        />
      </div>

      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-sm z-20">
        © 2026 Space Tech Solution. All rights reserved.
      </footer>
    </div>
  );
}
