-- ============================================================
-- 045: Schema Polishing & Professional Standards
-- ============================================================

-- 1. Add updated_at auditing to missing tables
DO $$
BEGIN
    -- payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'updated_at') THEN
        ALTER TABLE public.payments ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;

    -- attendance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'updated_at') THEN
        ALTER TABLE public.attendance ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;

    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'updated_at') THEN
        ALTER TABLE public.notes ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;

    -- chat_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'updated_at') THEN
        ALTER TABLE public.chat_messages ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;

    -- chat_channel_members
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_channel_members' AND column_name = 'updated_at') THEN
        ALTER TABLE public.chat_channel_members ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

-- 2. Apply updated_at triggers to these tables
CREATE TRIGGER tr_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_attendance_updated_at BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_chat_channel_members_updated_at BEFORE UPDATE ON public.chat_channel_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Add Soft Delete support (deleted_at)
DO $$
BEGIN
    -- users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- customers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.customers ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- sales
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.sales ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- chargebacks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chargebacks' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.chargebacks ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- leaves
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.leaves ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- payslips
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.payslips ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- attendance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.attendance ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- processing_accounts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'processing_accounts' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.processing_accounts ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.notes ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- marketing_entries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_entries' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.marketing_entries ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- chat_channels
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_channels' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.chat_channels ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- chat_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.chat_messages ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. Chat Performance Enhancements
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_channels' AND column_name = 'last_message_at') THEN
        ALTER TABLE public.chat_channels ADD COLUMN last_message_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_channels_last_message ON public.chat_channels(last_message_at DESC);

-- Trigger to update last_message_at when a new message is sent
CREATE OR REPLACE FUNCTION public.update_channel_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_channels
  SET last_message_at = NEW.created_at
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_chat_messages_last_message_at
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_channel_last_message_at();

-- 5. Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON public.users(full_name);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);

-- 6. Clean up: Ensure all Foreign Keys have indexes (for join performance)
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
