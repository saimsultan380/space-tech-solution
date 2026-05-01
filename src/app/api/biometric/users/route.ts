import { NextResponse } from "next/server";
import { zkTecoService } from "@/lib/services/zkteco-service";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/biometric/users
 * Get all users enrolled in ZKTeco K40 device
 */
export async function GET() {
  try {
    // Only super admins can fetch device users
    await requireRole(["super_admin"]);

    console.log("👥 Fetching users from ZKTeco K40...");

    await zkTecoService.connect();
    const users = await zkTecoService.getUsers();
    await zkTecoService.disconnect();

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Failed to fetch device users:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
