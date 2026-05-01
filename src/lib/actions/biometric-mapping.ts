"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface BiometricMapping {
  id: string;
  user_id: string;
  machine_user_id: string;
  machine_id: string;
  enrolled_at: string;
  last_synced_at: string | null;
  is_active: boolean;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

/**
 * Get all biometric user mappings
 */
export async function getBiometricMappings(): Promise<BiometricMapping[]> {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("biometric_user_mapping")
    .select(`
      id,
      user_id,
      machine_user_id,
      machine_id,
      enrolled_at,
      last_synced_at,
      is_active,
      user:users(id, full_name, email, role)
    `)
    .order("enrolled_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item: any) => ({
    ...item,
    user: Array.isArray(item.user) ? item.user[0] : item.user,
  }));
}

/**
 * Create a new biometric user mapping
 */
export async function createBiometricMapping(input: {
  user_id: string;
  machine_user_id: string;
  machine_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["super_admin"]);
    const supabase = await createClient();

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from("biometric_user_mapping")
      .select("id")
      .eq("user_id", input.user_id)
      .eq("machine_id", input.machine_id || "zkteco_k40")
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "This user is already mapped to the biometric device",
      };
    }

    // Check if machine_user_id is already used
    const { data: existingMachineId } = await supabase
      .from("biometric_user_mapping")
      .select("id, user:users(full_name)")
      .eq("machine_user_id", input.machine_user_id)
      .eq("machine_id", input.machine_id || "zkteco_k40")
      .maybeSingle();

    if (existingMachineId) {
      const userName = (existingMachineId as any).user?.full_name || "another user";
      return {
        success: false,
        error: `Machine User ID ${input.machine_user_id} is already mapped to ${userName}`,
      };
    }

    const { error } = await supabase.from("biometric_user_mapping").insert({
      user_id: input.user_id,
      machine_user_id: input.machine_user_id,
      machine_id: input.machine_id || "zkteco_k40",
      is_active: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create mapping",
    };
  }
}

/**
 * Update a biometric user mapping
 */
export async function updateBiometricMapping(
  id: string,
  input: {
    machine_user_id?: string;
    is_active?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["super_admin"]);
    const supabase = await createClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.machine_user_id !== undefined) {
      updateData.machine_user_id = input.machine_user_id;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    const { error } = await supabase
      .from("biometric_user_mapping")
      .update(updateData)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update mapping",
    };
  }
}

/**
 * Delete a biometric user mapping
 */
export async function deleteBiometricMapping(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["super_admin"]);
    const supabase = await createClient();

    const { error } = await supabase
      .from("biometric_user_mapping")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete mapping",
    };
  }
}

/**
 * Get biometric sync logs
 */
export async function getBiometricSyncLogs(limit: number = 20) {
  await requireRole(["super_admin"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("biometric_sync_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Trigger manual sync
 */
export async function triggerBiometricSync(): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    await requireRole(["super_admin"]);

    const secret = process.env.BIOMETRIC_SYNC_SECRET;
    if (!secret) {
      throw new Error("BIOMETRIC_SYNC_SECRET is not configured");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/biometric/sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Sync failed");
    }

    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to trigger sync",
    };
  }
}
