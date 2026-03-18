"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: {
  full_name: string;
  avatar_url?: string | null;
}) {
  const user = await requireAuth();
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({
      full_name: formData.full_name,
      avatar_url: formData.avatar_url ?? null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function requestPasswordReset(email: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) throw new Error(error.message);
}

export async function resetPassword(password: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) throw new Error(error.message);
}

export async function updatePreferences(formData: { preferred_currency: string }) {
  const user = await requireAuth();
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({
      preferred_currency: formData.preferred_currency,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function changePassword(formData: {
  new_password: string;
  confirm_password: string;
}) {
  if (!formData.new_password || formData.new_password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  if (formData.new_password !== formData.confirm_password) {
    throw new Error("Passwords do not match");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.auth.updateUser({
    password: formData.new_password,
  });

  if (error) throw new Error(error.message);
}

