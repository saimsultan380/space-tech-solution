-- ============================================================
-- 059: Missing Performance Indexes
-- Purpose: Cover high-frequency concurrent query patterns that
--          are not yet indexed, identified via query audit.
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ============================================================

-- 1. Notifications — most queried with (user_id, is_read, created_at DESC)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
      ON public.notifications(user_id, created_at DESC)
      WHERE is_read = false;

    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
      ON public.notifications(user_id, created_at DESC);
  END IF;
END $$;

-- 2. Users — active agents lookup (used by leaderboard, assignment dropdowns)
CREATE INDEX IF NOT EXISTS idx_users_role_active
  ON public.users(role, is_active)
  WHERE is_active = true;

-- 3. Sales — agent + date range (getAgentMonthlySalesTrends, getAgentRevenueOverTime)
--    Only add WHERE deleted_at IS NULL if the column exists on this table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='sales' AND column_name='deleted_at') THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_sales_agent_date_status
        ON public.sales(agent_id, created_at DESC, status)
        WHERE deleted_at IS NULL
    ';
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_sales_created_at_status_charged
        ON public.sales(created_at, status, charged_amount)
        WHERE deleted_at IS NULL
    ';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_sales_agent_date_status
      ON public.sales(agent_id, created_at DESC, status);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at_status_charged
      ON public.sales(created_at, status, charged_amount);
  END IF;
END $$;

-- 5. Chargebacks — index sale_id for leaderboard JOIN
--    No soft-delete column on this table, so no WHERE clause
CREATE INDEX IF NOT EXISTS idx_chargebacks_sale_id
  ON public.chargebacks(sale_id);

-- 6. Chat messages — unread count per channel (no deleted_at, uses is_deleted bool)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created_notdeleted
      ON public.chat_messages(channel_id, created_at DESC)
      WHERE is_deleted = false;
  END IF;
END $$;

-- 7. Leaves — current user status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leaves') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='leaves' AND column_name='deleted_at') THEN
      EXECUTE '
        CREATE INDEX IF NOT EXISTS idx_leaves_user_status_dates
          ON public.leaves(user_id, status, start_date, end_date)
          WHERE deleted_at IS NULL
      ';
    ELSE
      CREATE INDEX IF NOT EXISTS idx_leaves_user_status_dates
        ON public.leaves(user_id, status, start_date, end_date);
    END IF;
  END IF;
END $$;

-- 8. Attendance — quick per-user date lookup
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='attendance') THEN
    CREATE INDEX IF NOT EXISTS idx_attendance_user_date_today
      ON public.attendance(user_id, date DESC);
  END IF;
END $$;

-- Refresh planner statistics
ANALYZE public.sales;
ANALYZE public.users;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    ANALYZE public.notifications; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chargebacks') THEN
    ANALYZE public.chargebacks; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_messages') THEN
    ANALYZE public.chat_messages; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='attendance') THEN
    ANALYZE public.attendance; END IF;
END $$;
