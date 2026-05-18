import ZKLib from "zklib-js";
import { createAdminClient } from "@/lib/supabase/admin";

interface ZKTecoConfig {
  ip: string;
  port: number;
  timeout: number;
  machineId: string;
}

interface AttendanceLog {
  deviceUserId: string;
  recordTime: Date;
  ip: string;
}

interface SyncResult {
  success: boolean;
  recordsFetched: number;
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
}

export class ZKTecoService {
  private config: ZKTecoConfig;
  private zkInstance: any;

  constructor() {
    this.config = {
      ip: process.env.ZKTECO_IP || "192.168.1.201",
      port: Number(process.env.ZKTECO_PORT) || 4370,
      timeout: Number(process.env.ZKTECO_TIMEOUT) || 5000,
      machineId: process.env.ZKTECO_MACHINE_ID || "zkteco_k40",
    };
  }

  /**
   * Connect to ZKTeco device
   */
  async connect(): Promise<boolean> {
    try {
      this.zkInstance = new ZKLib(
        this.config.ip,
        this.config.port,
        this.config.timeout,
        10000
      );

      await this.zkInstance.createSocket();
      console.log(`✅ Connected to ZKTeco K40 at ${this.config.ip}:${this.config.port}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to connect to ZKTeco device:", error);
      throw new Error(
        `Failed to connect to ZKTeco device: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Disconnect from ZKTeco device
   */
  async disconnect(): Promise<void> {
    try {
      if (this.zkInstance) {
        await this.zkInstance.disconnect();
        console.log("✅ Disconnected from ZKTeco K40");
      }
    } catch (error) {
      console.error("⚠️ Error disconnecting from ZKTeco device:", error);
    }
  }

  /**
   * Get all attendance logs from the device
   */
  async getAttendanceLogs(): Promise<AttendanceLog[]> {
    try {
      const logs = await this.zkInstance.getAttendances();
      console.log(`📊 Fetched ${logs.data.length} attendance records from device`);
      return logs.data;
    } catch (error) {
      console.error("❌ Failed to fetch attendance logs:", error);
      throw new Error(
        `Failed to fetch attendance logs: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get all users enrolled in the device
   */
  async getUsers(): Promise<any[]> {
    try {
      const users = await this.zkInstance.getUsers();
      console.log(`👥 Fetched ${users.data.length} users from device`);
      return users.data;
    } catch (error) {
      console.error("❌ Failed to fetch users:", error);
      throw new Error(
        `Failed to fetch users: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Clear all attendance logs from the device (use with caution)
   */
  async clearAttendanceLogs(): Promise<void> {
    try {
      await this.zkInstance.clearAttendanceLog();
      console.log("🗑️ Cleared all attendance logs from device");
    } catch (error) {
      console.error("❌ Failed to clear attendance logs:", error);
      throw new Error(
        `Failed to clear attendance logs: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Sync attendance data from ZKTeco device to database
   */
  async syncAttendanceData(): Promise<SyncResult> {
    const supabase = createAdminClient();
    const result: SyncResult = {
      success: false,
      recordsFetched: 0,
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: [],
    };

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from("biometric_sync_log")
      .insert({
        machine_id: this.config.machineId,
        sync_started_at: new Date().toISOString(),
        status: "in_progress",
      })
      .select()
      .single();

    try {
      // Connect to device
      await this.connect();

      // Fetch attendance logs
      const logs = await this.getAttendanceLogs();
      result.recordsFetched = logs.length;

      // Get user mappings
      const { data: mappings } = await supabase
        .from("biometric_user_mapping")
        .select("user_id, machine_user_id")
        .eq("machine_id", this.config.machineId)
        .eq("is_active", true);

      if (!mappings || mappings.length === 0) {
        throw new Error("No user mappings found. Please configure user mappings first.");
      }

      // Create a map for quick lookup
      const userMap = new Map(
        mappings.map((m) => [m.machine_user_id, m.user_id])
      );

      // Process each log
      for (const log of logs) {
        try {
          const systemUserId = userMap.get(Number(log.deviceUserId));

          if (!systemUserId) {
            result.errors.push(
              `No mapping found for device user ID: ${log.deviceUserId}`
            );
            result.recordsFailed++;
            continue;
          }

          await this.processAttendanceRecord(
            systemUserId,
            log.recordTime,
            supabase
          );
          result.recordsProcessed++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push(
            `Failed to process record for device user ${log.deviceUserId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Disconnect from device
      await this.disconnect();

      result.success = true;

      // Update sync log
      if (syncLog) {
        await supabase
          .from("biometric_sync_log")
          .update({
            sync_completed_at: new Date().toISOString(),
            records_fetched: result.recordsFetched,
            records_processed: result.recordsProcessed,
            records_failed: result.recordsFailed,
            status: "completed",
            error_message: result.errors.length > 0 ? result.errors.join("; ") : null,
          })
          .eq("id", syncLog.id);
      }

      console.log("✅ Sync completed:", result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMessage);

      // Update sync log with error
      if (syncLog) {
        await supabase
          .from("biometric_sync_log")
          .update({
            sync_completed_at: new Date().toISOString(),
            records_fetched: result.recordsFetched,
            records_processed: result.recordsProcessed,
            records_failed: result.recordsFailed,
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", syncLog.id);
      }

      // Ensure disconnection
      await this.disconnect();

      throw error;
    }
  }

  /**
   * Process a single attendance record
   */
  private async processAttendanceRecord(
    userId: string,
    timestamp: Date,
    supabase: any
  ): Promise<void> {
    const date = timestamp.toISOString().split("T")[0];
    const timestampISO = timestamp.toISOString();

    // Check if record exists for this date
    const { data: existing } = await supabase
      .from("attendance")
      .select("id, check_in, check_out")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (!existing) {
      // First record of the day - treat as check-in
      await supabase.from("attendance").insert({
        user_id: userId,
        date: date,
        check_in: timestampISO,
        check_out: null,
      });
      console.log(`✅ Created check-in for user ${userId} on ${date}`);
    } else if (!existing.check_out) {
      // Record exists but no check-out - treat as check-out
      const checkInTime = new Date(existing.check_in).getTime();
      const checkOutTime = new Date(timestampISO).getTime();

      // Only update if check-out is after check-in
      if (checkOutTime > checkInTime) {
        await supabase
          .from("attendance")
          .update({ check_out: timestampISO })
          .eq("id", existing.id);
        console.log(`✅ Updated check-out for user ${userId} on ${date}`);
      }
    } else {
      // Both check-in and check-out exist - check if this is a later check-out
      const existingCheckOut = new Date(existing.check_out).getTime();
      const newCheckOut = new Date(timestampISO).getTime();

      if (newCheckOut > existingCheckOut) {
        await supabase
          .from("attendance")
          .update({ check_out: timestampISO })
          .eq("id", existing.id);
        console.log(`✅ Updated to later check-out for user ${userId} on ${date}`);
      }
    }

    // Update last synced timestamp in mapping
    await supabase
      .from("biometric_user_mapping")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("machine_id", this.config.machineId);
  }

  /**
   * Test connection to the device
   */
  async testConnection(): Promise<{ success: boolean; message: string; deviceInfo?: any }> {
    try {
      await this.connect();
      
      // Get device info
      const info = await this.zkInstance.getInfo();
      
      await this.disconnect();

      return {
        success: true,
        message: "Successfully connected to ZKTeco K40",
        deviceInfo: info,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }
}

// Export singleton instance
export const zkTecoService = new ZKTecoService();
