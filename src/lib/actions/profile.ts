"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: {
  full_name: string;
  avatar_url?: string | null;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      full_name: formData.full_name,
      avatar_url: formData.avatar_url ?? null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function updatePreferences(formData: { preferred_currency: string }) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      preferred_currency: formData.preferred_currency,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
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

