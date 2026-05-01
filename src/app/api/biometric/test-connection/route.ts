import { NextResponse } from "next/server";
import { zkTecoService } from "@/lib/services/zkteco-service";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/biometric/test-connection
 * Test connection to ZKTeco K40 device
 */
export async function POST() {
  try {
    // Only super admins can test connection
    await requireRole(["super_admin"]);

    console.log("🔌 Testing ZKTeco K40 connection...");

    const result = await zkTecoService.testConnection();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      deviceInfo: result.deviceInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Connection test error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
