import { NextResponse } from "next/server";
import { zkTecoService } from "@/lib/services/zkteco-service";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/biometric/sync
 * Sync attendance data from ZKTeco K40 device
 */
export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const secret = process.env.BIOMETRIC_SYNC_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🔄 Starting biometric sync...");

    // Perform sync
    const result = await zkTecoService.syncAttendanceData();

    // Revalidate attendance pages
    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "Biometric sync completed",
      data: {
        recordsFetched: result.recordsFetched,
        recordsProcessed: result.recordsProcessed,
        recordsFailed: result.recordsFailed,
        errors: result.errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Biometric sync error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/biometric/sync
 * Get sync status and recent logs
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.BIOMETRIC_SYNC_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    // Get recent sync logs
    const { data: logs, error } = await supabase
      .from("biometric_sync_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sync logs",
      },
      { status: 500 }
    );
  }
}
