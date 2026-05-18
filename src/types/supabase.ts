// Supabase Database Types
// Regenerate with:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Shared Enums / Aliases ───────────────────────────────────────────────────

export type UserRole =
  | "super_admin"
  | "sales_agent"
  | "processor";


export type EmployeeCategory = "Permanent" | "Contract" | "Contractual" | "Intern";
export type PaidThrough = "Bank" | "Cash" | "Cheque";

// ─── Generic row helper ───────────────────────────────────────────────────────
// All rows allow extra unknown keys to support select("*") and arbitrary joins.
type AnyRow = { [key: string]: unknown };

// ─── Database Schema ──────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      // ── users ──────────────────────────────────────────────────────────────
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          avatar_url: string | null;
          preferred_currency: string;
          allowed_modules: string[] | null;
          joining_date: string | null;
          category: EmployeeCategory | null;
          department: string | null;
          job_position: string | null;
          father_name: string | null;
          cnic: string | null;
          address: string | null;
          pay_days: number;
          pay_rate: number;
          gross_pay: number;
          basic_salary: number;
          paid_through: PaidThrough;
          bank_account_no: string | null;
          bank_branch: string | null;
          bank_name: string | null;
          employee_id: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role: UserRole;
          is_active?: boolean;
          preferred_currency?: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── sales ──────────────────────────────────────────────────────────────
      sales: {
        Row: {
          id: string;
          agent_id: string;
          customer_id: string | null;
          processor_id: string | null;
          status: string;
          sale_type: string | null;
          subtype: string | null;
          company_name: string | null;
          amount: number;
          discount: number;
          charged_amount: number;
          billed_month: string | null;
          sale_date: string | null;
          created_at: string;
          updated_at: string;
          account_status: string | null;
          payment_status_after_sale: string | null;
          next_billing_date: string | null;
          expected_next_bill_date: string | null;
          payment_method: string | null;
          merchant_name: string | null;
          guest_pay_enabled: boolean;
          guest_pay_link: string | null;
          policy_holder_name: string | null;
          account_holder_name: string | null;
          dob: string | null;
          utility_company_service_number: string | null;
          utility_company_phone: string | null;
          vehicle_details: string | null;
          card_last_four: string | null;
          chargeback_status: string | null;
          processing_notes: string | null;
          deleted_at: string | null;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── customers ──────────────────────────────────────────────────────────
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          service_address: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── attendance ─────────────────────────────────────────────────────────
      attendance: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          check_in: string;
          check_out: string | null;
          notes: string | null;
        } & AnyRow;
        Insert: { user_id: string; date: string; check_in: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── attendance_settings ────────────────────────────────────────────────
      attendance_settings: {
        Row: {
          id: number;
          shift_start_time: string;
          late_after_time: string;
          shift_end_time: string;
          checkout_latest_time: string;
          checkout_grace_minutes: number;
          allow_early_checkout: boolean;
          early_checkout_minutes: number;
          notify_after_minutes: number;
          auto_leave_after_minutes: number;
          auto_leave_enabled: boolean;
          auto_leave_type: string;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── attendance_notifications ───────────────────────────────────────────
      attendance_notifications: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          notification_type: string;
          created_at: string;
        } & AnyRow;
        Insert: { user_id: string; date: string; notification_type: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── chargebacks ────────────────────────────────────────────────────────
      chargebacks: {
        Row: {
          id: string;
          sale_id: string;
          agent_id: string;
          assigned_to: string | null;
          amount: number;
          reason: string | null;
          status: string;
          priority: string | null;
          date: string | null;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── chargeback_activity ────────────────────────────────────────────────
      chargeback_activity: {
        Row: {
          id: string;
          chargeback_id: string;
          actor_id: string | null;
          event_type: string;
          details: string | null;
          created_at: string;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── chargeback_notes ───────────────────────────────────────────────────
      chargeback_notes: {
        Row: {
          id: string;
          chargeback_id: string;
          user_id: string;
          content: string;
          created_at: string;
        } & AnyRow;
        Insert: { chargeback_id: string; user_id: string; content: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── notes ──────────────────────────────────────────────────────────────
      notes: {
        Row: {
          id: string;
          sale_id: string | null;
          customer_id: string | null;
          user_id: string;
          content: string;
          type: string | null;
          is_important: boolean;
          created_at: string;
        } & AnyRow;
        Insert: { user_id: string; content: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── leaves ─────────────────────────────────────────────────────────────
      leaves: {
        Row: {
          id: string;
          user_id: string;
          start_date: string;
          end_date: string;
          type: string | null;
          reason: string | null;
          status: string;
          approver_notes: string | null;
          source: string | null;
          created_at: string;
        } & AnyRow;
        Insert: { user_id: string; start_date: string; end_date: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── payslips ───────────────────────────────────────────────────────────
      payslips: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          pay_date: string;
          basic_salary: number;
          allowances: number;
          deductions: number;
          bonus: number;
          net_pay: number;
          currency: string;
          status: string;
          generated_by: string | null;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { user_id: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── notifications ──────────────────────────────────────────────────────
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string | null;
          body: string | null;
          type: string | null;
          is_read: boolean;
          created_at: string;
        } & AnyRow;
        Insert: { user_id: string; title: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── processing_accounts ────────────────────────────────────────────────
      processing_accounts: {
        Row: {
          id: string;
          account_holder_name: string;
          account_type: string | null;
          routing_number_encrypted: string;
          account_number_encrypted: string;
          card_number_encrypted: string | null;
          expiration_date: string | null;
          cvv_encrypted: string | null;
          billing_address: string;
          status: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { created_by: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── banks ──────────────────────────────────────────────────────────────
      banks: {
        Row: { id: string; name: string; created_at: string } & AnyRow;
        Insert: { name: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── agent_names ────────────────────────────────────────────────────────
      agent_names: {
        Row: { id: string; name: string; created_at: string } & AnyRow;
        Insert: { name: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── payments ───────────────────────────────────────────────────────────
      payments: {
        Row: {
          id: string;
          sale_id: string;
          customer_id: string | null;
          method: string | null;
          amount: number;
          card_last_four: string | null;
          card_exp: string | null;
          card_cvv_encrypted: string | null;
          billing_address: string | null;
          merchant_name: string | null;
          bank_name: string | null;
          routing_number_encrypted: string | null;
          account_number_encrypted: string | null;
          account_holder_name: string | null;
          encrypted_details: string | null;
          created_at: string;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── sale_attachments ───────────────────────────────────────────────────
      sale_attachments: {
        Row: {
          id: string;
          sale_id: string;
          file_url: string;
          file_name: string;
          file_path: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          created_at: string;
        } & AnyRow;
        Insert: { sale_id: string; file_url: string; file_name: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── personal_notes ─────────────────────────────────────────────────────
      personal_notes: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          content: string;
          color: string;
          pinned: boolean;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { user_id: string; content: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── company_settings ───────────────────────────────────────────────────
      company_settings: {
        Row: {
          id: number;
          key: string | null;
          value: string | null;
          company_name: string;
          address_line: string;
          contact_email: string;
          logo_url: string | null;
          shell_bg_color: string | null;
          shell_text_color: string | null;
          sidebar_color: string | null;
          sidebar_text_color: string | null;
          button_color: string | null;
          button_text_color: string | null;
          active_tab_color: string | null;
          active_tab_text_color: string | null;
          chat_user_bubble_color: string | null;
          chat_user_bubble_text_color: string | null;
          chat_bot_bubble_color: string | null;
          chat_bot_bubble_text_color: string | null;
          updated_at: string;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── chat_channels ──────────────────────────────────────────────────────
      chat_channels: {
        Row: {
          id: string;
          name: string | null;
          type: string;
          created_at: string;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── chat_channel_members ───────────────────────────────────────────────
      chat_channel_members: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          joined_at: string;
        } & AnyRow;
        Insert: { channel_id: string; user_id: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── chat_messages ──────────────────────────────────────────────────────
      chat_messages: {
        Row: {
          id: string;
          channel_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        } & AnyRow;
        Insert: { channel_id: string; sender_id: string; content: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── chat_events ────────────────────────────────────────────────────────
      chat_events: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string | null;
          event_type: string;
          created_at: string;
        } & AnyRow;
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── marketing_campaigns ────────────────────────────────────────────────
      marketing_campaigns: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          total_budget: number;
          start_date: string | null;
          end_date: string | null;
          assigned_to: string | null;
          status: string;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { name: string; created_by: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── marketing_entries ──────────────────────────────────────────────────
      marketing_entries: {
        Row: {
          id: string;
          entry_date: string;
          campaign: string | null;
          budget_assigned: number;
          calls_landed: number;
          dropped_calls: number;
          sales_acquired: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { created_by: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── marketing_budget_transactions ──────────────────────────────────────
      marketing_budget_transactions: {
        Row: {
          id: string;
          transaction_date: string;
          type: string;
          campaign_id: string | null;
          amount: number;
          performed_by: string;
          note: string | null;
          created_at: string;
        } & AnyRow;
        Insert: { amount: number; performed_by: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── marketing_daily_call_logs ──────────────────────────────────────────
      marketing_daily_call_logs: {
        Row: {
          id: string;
          log_date: string;
          campaign_id: string;
          user_id: string;
          calls_made: number;
          cost_per_call: number;
          total_daily_cost: number;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { campaign_id: string; user_id: string; created_by: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── marketing_daily_campaign_budgets ───────────────────────────────────
      marketing_daily_campaign_budgets: {
        Row: {
          id: string;
          budget_date: string;
          campaign_id: string;
          daily_budget_allocated: number;
          daily_spent_manual: number | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        } & AnyRow;
        Insert: { campaign_id: string; created_by: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── biometric_mappings ─────────────────────────────────────────────────
      biometric_mappings: {
        Row: {
          id: string;
          user_id: string;
          device_user_id: number;
          created_at: string;
        } & AnyRow;
        Insert: { user_id: string; device_user_id: number; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── biometric_user_mapping ─────────────────────────────────────────────
      biometric_user_mapping: {
        Row: {
          id: string;
          user_id: string;
          machine_user_id: number;
          created_at: string;
        } & AnyRow;
        Insert: { user_id: string; machine_user_id: number; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };

      // ── biometric_sync_log ─────────────────────────────────────────────────
      biometric_sync_log: {
        Row: {
          id: string;
          machine_id: string;
          sync_started_at: string;
          sync_completed_at: string | null;
          records_fetched: number | null;
          records_processed: number | null;
          records_failed: number | null;
          status: string;
          error_message: string | null;
        } & AnyRow;
        Insert: { machine_id: string; sync_started_at: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      get_dashboard_analytics: {
        Args: { month_filter: string | null };
        Returns: {
          total_sales: number;
          rejected_sales: number;
          total_revenue: number;
          total_customers: number;
          total_chargebacks: number;
          open_chargebacks: number;
          total_call_logs: number;
          total_processing_accounts: number;
          pending_leaves: number;
          today_on_leave: number;
        }[];
      };
      get_sales_per_agent_stats: {
        Args: { target_month: string | null };
        Returns: { name: string; total: number; approved: number; revenue: number }[];
      };
      get_sales_per_processor_stats: {
        Args: { target_month: string | null };
        Returns: { name: string; total: number; approved: number; rejected: number }[];
      };
      get_chargebacks_per_employee_stats: {
        Args: { target_month: string | null };
        Returns: { name: string; count: number }[];
      };
      get_revenue_over_time: {
        Args: { period_type: string };
        Returns: { date: string; revenue: number }[];
      };
      get_sales_leaderboard: {
        Args: { target_month?: string | null };
        Returns: {
          agent_id: string;
          name: string;
          total: number;
          approved: number;
          revenue: number;
        }[];
      };
      get_my_chat_channels: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string | null;
          type: string;
          last_message: string | null;
          last_message_at: string | null;
          unread_count: number;
        }[];
      };
      get_direct_message_channel: {
        Args: { other_user_id: string };
        Returns: { channel_id: string }[];
      };
      ensure_user_employee_id: {
        Args: { p_user_id: string };
        Returns: string;
      };
    };

    Enums: {
      user_role: UserRole;
      employee_category: EmployeeCategory;
      paid_through: PaidThrough;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
}