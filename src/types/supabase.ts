export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_names: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_notifications: {
        Row: {
          date: string
          id: string
          notification_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          notification_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          notification_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          allow_early_checkout: boolean
          auto_leave_after_minutes: number
          auto_leave_enabled: boolean
          auto_leave_type: string
          checkout_grace_minutes: number
          checkout_latest_time: string
          created_at: string
          early_checkout_minutes: number
          id: number
          late_after_time: string
          notify_after_minutes: number
          shift_end_time: string
          shift_start_time: string
          updated_at: string
        }
        Insert: {
          allow_early_checkout?: boolean
          auto_leave_after_minutes?: number
          auto_leave_enabled?: boolean
          auto_leave_type?: string
          checkout_grace_minutes?: number
          checkout_latest_time?: string
          created_at?: string
          early_checkout_minutes?: number
          id?: number
          late_after_time?: string
          notify_after_minutes?: number
          shift_end_time?: string
          shift_start_time?: string
          updated_at?: string
        }
        Update: {
          allow_early_checkout?: boolean
          auto_leave_after_minutes?: number
          auto_leave_enabled?: boolean
          auto_leave_type?: string
          checkout_grace_minutes?: number
          checkout_latest_time?: string
          created_at?: string
          early_checkout_minutes?: number
          id?: number
          late_after_time?: string
          notify_after_minutes?: number
          shift_end_time?: string
          shift_start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      banks: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      biometric_sync_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          machine_id: string
          records_failed: number | null
          records_fetched: number | null
          records_processed: number | null
          status: string | null
          sync_completed_at: string | null
          sync_started_at: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          machine_id: string
          records_failed?: number | null
          records_fetched?: number | null
          records_processed?: number | null
          status?: string | null
          sync_completed_at?: string | null
          sync_started_at: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          machine_id?: string
          records_failed?: number | null
          records_fetched?: number | null
          records_processed?: number | null
          status?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string
        }
        Relationships: []
      }
      biometric_user_mapping: {
        Row: {
          created_at: string | null
          enrolled_at: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          machine_id: string | null
          machine_user_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          machine_id?: string | null
          machine_user_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          machine_id?: string | null
          machine_user_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_user_mapping_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chargeback_activity: {
        Row: {
          actor_id: string | null
          chargeback_id: string
          created_at: string
          details: string | null
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          chargeback_id: string
          created_at?: string
          details?: string | null
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          chargeback_id?: string
          created_at?: string
          details?: string | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chargeback_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chargeback_activity_chargeback_id_fkey"
            columns: ["chargeback_id"]
            isOneToOne: false
            referencedRelation: "chargebacks"
            referencedColumns: ["id"]
          },
        ]
      }
      chargeback_notes: {
        Row: {
          chargeback_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          chargeback_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          chargeback_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chargeback_notes_chargeback_id_fkey"
            columns: ["chargeback_id"]
            isOneToOne: false
            referencedRelation: "chargebacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chargeback_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chargebacks: {
        Row: {
          assigned_to: string | null
          created_at: string
          date: string
          id: string
          priority: string
          reason: string
          sale_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          date?: string
          id?: string
          priority?: string
          reason?: string
          sale_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          date?: string
          id?: string
          priority?: string
          reason?: string
          sale_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chargebacks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chargebacks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          is_direct: boolean
          last_message_at: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          is_direct?: boolean
          last_message_at?: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          is_direct?: boolean
          last_message_at?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_events: {
        Row: {
          channel_id: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          event_date: string
          id: string
          is_reminder_sent: boolean | null
          title: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          event_date: string
          id?: string
          is_reminder_sent?: boolean | null
          title: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          event_date?: string
          id?: string
          is_reminder_sent?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          channel_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean
          is_pinned: boolean | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          is_pinned?: boolean | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          is_pinned?: boolean | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          active_tab_color: string | null
          active_tab_text_color: string | null
          address_line: string
          button_color: string | null
          button_text_color: string | null
          chat_bot_bubble_color: string | null
          chat_bot_bubble_text_color: string | null
          chat_user_bubble_color: string | null
          chat_user_bubble_text_color: string | null
          company_name: string
          contact_email: string
          id: number
          logo_url: string | null
          shell_bg_color: string | null
          shell_text_color: string | null
          sidebar_color: string | null
          sidebar_text_color: string | null
          updated_at: string
        }
        Insert: {
          active_tab_color?: string | null
          active_tab_text_color?: string | null
          address_line?: string
          button_color?: string | null
          button_text_color?: string | null
          chat_bot_bubble_color?: string | null
          chat_bot_bubble_text_color?: string | null
          chat_user_bubble_color?: string | null
          chat_user_bubble_text_color?: string | null
          company_name?: string
          contact_email?: string
          id?: number
          logo_url?: string | null
          shell_bg_color?: string | null
          shell_text_color?: string | null
          sidebar_color?: string | null
          sidebar_text_color?: string | null
          updated_at?: string
        }
        Update: {
          active_tab_color?: string | null
          active_tab_text_color?: string | null
          address_line?: string
          button_color?: string | null
          button_text_color?: string | null
          chat_bot_bubble_color?: string | null
          chat_bot_bubble_text_color?: string | null
          chat_user_bubble_color?: string | null
          chat_user_bubble_text_color?: string | null
          company_name?: string
          contact_email?: string
          id?: number
          logo_url?: string | null
          shell_bg_color?: string | null
          shell_text_color?: string | null
          sidebar_color?: string | null
          sidebar_text_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          account_no: string
          address: string
          cnic: string
          created_at: string
          created_by: string
          deleted_at: string | null
          dob: string | null
          email: string
          id: string
          name: string
          phone: string
          source: string
          ssn_encrypted: string
          updated_at: string
        }
        Insert: {
          account_no?: string
          address?: string
          cnic?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          dob?: string | null
          email: string
          id?: string
          name: string
          phone: string
          source?: string
          ssn_encrypted?: string
          updated_at?: string
        }
        Update: {
          account_no?: string
          address?: string
          cnic?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          dob?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          source?: string
          ssn_encrypted?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          approver_id: string | null
          approver_notes: string | null
          created_at: string
          end_date: string
          id: string
          reason: string
          source: string
          start_date: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approver_id?: string | null
          approver_notes?: string | null
          created_at?: string
          end_date: string
          id?: string
          reason?: string
          source?: string
          start_date: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approver_id?: string | null
          approver_notes?: string | null
          created_at?: string
          end_date?: string
          id?: string
          reason?: string
          source?: string
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaves_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_budget_transactions: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          id: string
          note: string
          performed_by: string
          transaction_date: string
          type: string
        }
        Insert: {
          amount?: number
          campaign_id: string
          created_at?: string
          id?: string
          note?: string
          performed_by: string
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          id?: string
          note?: string
          performed_by?: string
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_budget_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_budget_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          end_date: string
          id: string
          name: string
          notes: string
          start_date: string
          status: string
          total_budget: number
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          name: string
          notes?: string
          start_date: string
          status?: string
          total_budget?: number
          type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          name?: string
          notes?: string
          start_date?: string
          status?: string
          total_budget?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_daily_call_logs: {
        Row: {
          calls_made: number
          campaign_id: string
          cost_per_call: number
          created_at: string
          created_by: string
          id: string
          log_date: string
          notes: string
          total_daily_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_made?: number
          campaign_id: string
          cost_per_call?: number
          created_at?: string
          created_by: string
          id?: string
          log_date: string
          notes?: string
          total_daily_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_made?: number
          campaign_id?: string
          cost_per_call?: number
          created_at?: string
          created_by?: string
          id?: string
          log_date?: string
          notes?: string
          total_daily_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_daily_call_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_daily_call_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_daily_call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_daily_campaign_budgets: {
        Row: {
          budget_date: string
          campaign_id: string
          created_at: string
          created_by: string
          daily_budget_allocated: number
          daily_spent_manual: number | null
          id: string
          notes: string
          updated_at: string
        }
        Insert: {
          budget_date: string
          campaign_id: string
          created_at?: string
          created_by: string
          daily_budget_allocated?: number
          daily_spent_manual?: number | null
          id?: string
          notes?: string
          updated_at?: string
        }
        Update: {
          budget_date?: string
          campaign_id?: string
          created_at?: string
          created_by?: string
          daily_budget_allocated?: number
          daily_spent_manual?: number | null
          id?: string
          notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_daily_campaign_budgets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_daily_campaign_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_entries: {
        Row: {
          budget_assigned: number
          calls_landed: number
          campaign: string
          created_at: string
          created_by: string
          dropped_calls: number
          entry_date: string
          id: string
          sales_acquired: number
          updated_at: string
        }
        Insert: {
          budget_assigned?: number
          calls_landed?: number
          campaign: string
          created_at?: string
          created_by: string
          dropped_calls?: number
          entry_date: string
          id?: string
          sales_acquired?: number
          updated_at?: string
        }
        Update: {
          budget_assigned?: number
          calls_landed?: number
          campaign?: string
          created_at?: string
          created_by?: string
          dropped_calls?: number
          entry_date?: string
          id?: string
          sales_acquired?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          customer_id: string | null
          id: string
          is_important: boolean
          sale_id: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_important?: boolean
          sale_id?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_important?: boolean
          sale_id?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_holder_name: string | null
          account_number_encrypted: string | null
          amount: number
          bank_name: string | null
          billing_address: string | null
          card_cvv_encrypted: string | null
          card_exp: string | null
          card_last_four: string | null
          created_at: string
          customer_id: string
          encrypted_details: string
          id: string
          merchant_name: string | null
          method: string
          routing_number_encrypted: string | null
          sale_id: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number_encrypted?: string | null
          amount?: number
          bank_name?: string | null
          billing_address?: string | null
          card_cvv_encrypted?: string | null
          card_exp?: string | null
          card_last_four?: string | null
          created_at?: string
          customer_id: string
          encrypted_details?: string
          id?: string
          merchant_name?: string | null
          method: string
          routing_number_encrypted?: string | null
          sale_id: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number_encrypted?: string | null
          amount?: number
          bank_name?: string | null
          billing_address?: string | null
          card_cvv_encrypted?: string | null
          card_exp?: string | null
          card_last_four?: string | null
          created_at?: string
          customer_id?: string
          encrypted_details?: string
          id?: string
          merchant_name?: string | null
          method?: string
          routing_number_encrypted?: string | null
          sale_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          address: string | null
          advance: number | null
          allowances: number
          bank_account_no: string | null
          bank_branch: string | null
          basic_salary: number
          bonus: number
          category: string | null
          chargeback_amount: number | null
          cnic_no: string | null
          commission: number | null
          created_at: string
          currency: string
          deductions: number
          department: string | null
          employee_id_display: string | null
          father_name: string | null
          generated_by: string | null
          gross_pay: number | null
          id: string
          job_position: string | null
          joining_date: string | null
          late_attendance: number | null
          leaves: number | null
          monthly_revenue: number | null
          net_pay: number
          paid_through: string | null
          pay_date: string
          pay_days: number | null
          pay_rate: number | null
          pdf_url: string | null
          period_end: string
          period_start: string
          remaining: number | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          advance?: number | null
          allowances?: number
          bank_account_no?: string | null
          bank_branch?: string | null
          basic_salary?: number
          bonus?: number
          category?: string | null
          chargeback_amount?: number | null
          cnic_no?: string | null
          commission?: number | null
          created_at?: string
          currency?: string
          deductions?: number
          department?: string | null
          employee_id_display?: string | null
          father_name?: string | null
          generated_by?: string | null
          gross_pay?: number | null
          id?: string
          job_position?: string | null
          joining_date?: string | null
          late_attendance?: number | null
          leaves?: number | null
          monthly_revenue?: number | null
          net_pay?: number
          paid_through?: string | null
          pay_date: string
          pay_days?: number | null
          pay_rate?: number | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          remaining?: number | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          advance?: number | null
          allowances?: number
          bank_account_no?: string | null
          bank_branch?: string | null
          basic_salary?: number
          bonus?: number
          category?: string | null
          chargeback_amount?: number | null
          cnic_no?: string | null
          commission?: number | null
          created_at?: string
          currency?: string
          deductions?: number
          department?: string | null
          employee_id_display?: string | null
          father_name?: string | null
          generated_by?: string | null
          gross_pay?: number | null
          id?: string
          job_position?: string | null
          joining_date?: string | null
          late_attendance?: number | null
          leaves?: number | null
          monthly_revenue?: number | null
          net_pay?: number
          paid_through?: string | null
          pay_date?: string
          pay_days?: number | null
          pay_rate?: number | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          remaining?: number | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_notes: {
        Row: {
          color: string | null
          content: string
          created_at: string
          id: string
          pinned: boolean | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string
          id?: string
          pinned?: boolean | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_accounts: {
        Row: {
          account_holder_name: string
          account_number_encrypted: string
          account_type: string | null
          billing_address: string
          card_number_encrypted: string | null
          created_at: string
          created_by: string
          cvv_encrypted: string | null
          expiration_date: string | null
          id: string
          notes: string | null
          routing_number_encrypted: string
          status: string | null
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_number_encrypted: string
          account_type?: string | null
          billing_address: string
          card_number_encrypted?: string | null
          created_at?: string
          created_by: string
          cvv_encrypted?: string | null
          expiration_date?: string | null
          id?: string
          notes?: string | null
          routing_number_encrypted: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_number_encrypted?: string
          account_type?: string | null
          billing_address?: string
          card_number_encrypted?: string | null
          created_at?: string
          created_by?: string
          cvv_encrypted?: string | null
          expiration_date?: string | null
          id?: string
          notes?: string | null
          routing_number_encrypted?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_url: string
          id: string
          mime_type: string
          sale_id: string
          size_bytes: number
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_url: string
          id?: string
          mime_type?: string
          sale_id: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_url?: string
          id?: string
          mime_type?: string
          sale_id?: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_attachments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          account_holder_name: string
          account_status: string
          agent_id: string
          agent_name: string | null
          amount: number
          billed_month: string
          card_last_four: string | null
          charged_amount: number
          company_name: string
          created_at: string
          customer_email: string
          customer_id: string
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          discount: number
          dob: string
          expected_next_bill_date: string | null
          guest_pay_enabled: boolean
          guest_pay_link: string | null
          id: string
          merchant_name: string
          next_billing_date: string | null
          other_sale_data: string
          payment_method: string
          payment_status_after_sale: string | null
          policy_holder_name: string
          processing_notes: string
          processor_id: string | null
          sale_date: string | null
          sale_type: string
          sales_notes: string
          service_address: string
          ssn_encrypted: string
          status: string
          subtype: string
          updated_at: string
          utility_company_phone: string | null
          utility_company_service_number: string
          vehicle_details: string
        }
        Insert: {
          account_holder_name?: string
          account_status?: string
          agent_id: string
          agent_name?: string | null
          amount?: number
          billed_month: string
          card_last_four?: string | null
          charged_amount?: number
          company_name: string
          created_at?: string
          customer_email?: string
          customer_id: string
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          discount?: number
          dob?: string
          expected_next_bill_date?: string | null
          guest_pay_enabled?: boolean
          guest_pay_link?: string | null
          id?: string
          merchant_name?: string
          next_billing_date?: string | null
          other_sale_data?: string
          payment_method?: string
          payment_status_after_sale?: string | null
          policy_holder_name?: string
          processing_notes?: string
          processor_id?: string | null
          sale_date?: string | null
          sale_type: string
          sales_notes?: string
          service_address?: string
          ssn_encrypted?: string
          status?: string
          subtype: string
          updated_at?: string
          utility_company_phone?: string | null
          utility_company_service_number?: string
          vehicle_details?: string
        }
        Update: {
          account_holder_name?: string
          account_status?: string
          agent_id?: string
          agent_name?: string | null
          amount?: number
          billed_month?: string
          card_last_four?: string | null
          charged_amount?: number
          company_name?: string
          created_at?: string
          customer_email?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          discount?: number
          dob?: string
          expected_next_bill_date?: string | null
          guest_pay_enabled?: boolean
          guest_pay_link?: string | null
          id?: string
          merchant_name?: string
          next_billing_date?: string | null
          other_sale_data?: string
          payment_method?: string
          payment_status_after_sale?: string | null
          policy_holder_name?: string
          processing_notes?: string
          processor_id?: string | null
          sale_date?: string | null
          sale_type?: string
          sales_notes?: string
          service_address?: string
          ssn_encrypted?: string
          status?: string
          subtype?: string
          updated_at?: string
          utility_company_phone?: string | null
          utility_company_service_number?: string
          vehicle_details?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_processor_id_fkey"
            columns: ["processor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          allowed_modules: string[] | null
          avatar_url: string | null
          bank_account_no: string | null
          bank_branch: string | null
          bank_name: string | null
          basic_salary: number | null
          category: string | null
          cnic: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          education_degree: string | null
          email: string
          employee_id: string | null
          employment_type: string | null
          father_name: string | null
          full_name: string
          gross_pay: number | null
          id: string
          is_active: boolean
          job_position: string | null
          joining_date: string | null
          paid_through: string | null
          pay_days: number | null
          pay_rate: number | null
          preferred_currency: string | null
          role: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allowed_modules?: string[] | null
          avatar_url?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          category?: string | null
          cnic?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          education_degree?: string | null
          email: string
          employee_id?: string | null
          employment_type?: string | null
          father_name?: string | null
          full_name: string
          gross_pay?: number | null
          id: string
          is_active?: boolean
          job_position?: string | null
          joining_date?: string | null
          paid_through?: string | null
          pay_days?: number | null
          pay_rate?: number | null
          preferred_currency?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allowed_modules?: string[] | null
          avatar_url?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          category?: string | null
          cnic?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          education_degree?: string | null
          email?: string
          employee_id?: string | null
          employment_type?: string | null
          father_name?: string | null
          full_name?: string
          gross_pay?: number | null
          id?: string
          is_active?: boolean
          job_position?: string | null
          joining_date?: string | null
          paid_through?: string | null
          pay_days?: number | null
          pay_rate?: number | null
          preferred_currency?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_self_chat: { Args: { p_user_id: string }; Returns: string }
      ensure_user_employee_id: { Args: { p_user_id: string }; Returns: string }
      generate_employee_id: { Args: never; Returns: string }
      get_agent_dashboard_stats: {
        Args: { p_agent_id: string; p_month: string }
        Returns: {
          approved_sales: number
          month_revenue: number
          month_sales: number
          pending_sales: number
          rejected_sales: number
          today_revenue: number
          today_sales: number
          total_revenue: number
          total_sales: number
        }[]
      }
      get_agent_monthly_trends: {
        Args: { p_agent_id: string; p_months?: number }
        Returns: {
          month_key: string
          revenue: number
          sales: number
        }[]
      }
      get_agent_performance_stats: {
        Args: { p_agent_id: string }
        Returns: {
          approved_sales: number
          month_revenue: number
          month_sales: number
          quarter_revenue: number
          quarter_sales: number
          rejected_sales: number
          total_chargebacks: number
          total_revenue: number
          total_sales: number
        }[]
      }
      get_chargebacks_per_employee_stats: {
        Args: { target_month: string }
        Returns: {
          agent_id: string
          count: number
          name: string
        }[]
      }
      get_dashboard_analytics: {
        Args: { month_filter?: string }
        Returns: {
          open_chargebacks: number
          pending_leaves: number
          rejected_sales: number
          today_on_leave: number
          total_call_logs: number
          total_chargebacks: number
          total_customers: number
          total_processing_accounts: number
          total_revenue: number
          total_sales: number
        }[]
      }
      get_direct_message_channel: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_filtered_chargeback_stats: {
        Args: {
          p_amount_sale_ids?: string[] | null
          p_assigned_to?: string | null
          p_assignee_ids?: string[] | null
          p_from_date?: string | null
          p_sale_ids?: string[] | null
          p_search?: string | null
          p_status?: string | null
          p_to_date?: string | null
        }
        Returns: Json
      }
      get_filtered_sales_stats: {
        Args: {
          p_agent_id?: string | null
          p_from_date?: string | null
          p_sale_type?: string | null
          p_search?: string | null
          p_to_date?: string | null
        }
        Returns: Json
      }
      get_my_chat_channels: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          created_by: string
          description: string
          dm_partner_avatar_url: string
          dm_partner_id: string
          dm_partner_name: string
          id: string
          is_direct: boolean
          last_message_at: string
          last_message_content: string
          last_message_created_at: string
          last_message_sender_name: string
          name: string
        }[]
      }
      get_processor_dashboard_stats: {
        Args: never
        Returns: {
          sales_this_week: number
          total_sales: number
          week_recorded_revenue: number
        }[]
      }
      get_revenue_over_time: {
        Args: { period_type?: string }
        Returns: {
          date: string
          revenue: number
        }[]
      }
      get_sales_leaderboard: {
        Args: never
        Returns: {
          agent_id: string
          agent_name: string
          approved_sales: number
          avatar_url: string
          chargebacks: number
          conversion_rate: number
          rank: number
          rejected_sales: number
          revenue: number
          total_sales: number
        }[]
      }
      get_sales_per_agent_stats: {
        Args: { target_month: string }
        Returns: {
          agent_id: string
          approved: number
          name: string
          revenue: number
          total: number
        }[]
      }
      get_sales_per_processor_stats: {
        Args: { target_month: string }
        Returns: {
          approved: number
          name: string
          processor_id: string
          rejected: number
          total: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      is_channel_member: { Args: { chan_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
