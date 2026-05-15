# Quick Start - Apply Database Changes

## Step 1: Run the Migration

You have two options to apply the database changes:

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL below:

```sql
-- ============================================
-- Add guest pay and billing status fields to sales table
-- ============================================

-- Add new fields to sales table
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS utility_company_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_pay_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_pay_link TEXT,
  ADD COLUMN IF NOT EXISTS payment_status_after_sale TEXT CHECK (payment_status_after_sale IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS expected_next_bill_date DATE;

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_sales_guest_pay_enabled ON public.sales(guest_pay_enabled);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status_after_sale ON public.sales(payment_status_after_sale);
CREATE INDEX IF NOT EXISTS idx_sales_expected_next_bill_date ON public.sales(expected_next_bill_date);

-- Add comment for documentation
COMMENT ON COLUMN public.sales.utility_company_phone IS 'Phone number for the utility company';
COMMENT ON COLUMN public.sales.guest_pay_enabled IS 'Whether guest pay is enabled for this sale';
COMMENT ON COLUMN public.sales.guest_pay_link IS 'Link for guest payment portal';
COMMENT ON COLUMN public.sales.payment_status_after_sale IS 'Payment status after the sale is completed';
COMMENT ON COLUMN public.sales.expected_next_bill_date IS 'Expected date for the next bill';
```

5. Click **Run** or press `Ctrl+Enter`
6. Verify success message appears

### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# The migration file is already created at:
# supabase/migrations/055_add_sales_guest_pay_and_billing_fields.sql

# Push the migration to your database
supabase db push
```

## Step 2: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 3: Test the New Fields

### Test Creating a New Sale
1. Go to `/dashboard/sales/new`
2. Fill out the form
3. Look for these new fields:
   - **Utility Company Phone** (in Utility Details section)
   - **Guest Pay** toggle and link (new card section)
   - **Payment Status After Sale** dropdown (in Billing section)
   - **Expected Next Bill Date** (in Billing section)
4. Submit the form
5. Verify the sale is created successfully

### Test Editing an Existing Sale
1. Go to any sale detail page
2. Click "Edit full record"
3. Verify all new fields are present
4. Make changes and save
5. Verify changes are saved

### Test Viewing Sale Details
1. Go to any sale detail page
2. Verify new fields are displayed:
   - Utility company phone (in Utility Details card)
   - Payment Status After Sale (in Billing card)
   - Expected Next Bill Date (in Billing card)
   - Guest Pay section (new card)

## Verification Queries

Run these in Supabase SQL Editor to verify the migration:

```sql
-- Check if columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sales'
  AND column_name IN (
    'utility_company_phone',
    'guest_pay_enabled',
    'guest_pay_link',
    'payment_status_after_sale',
    'expected_next_bill_date'
  );

-- Check if indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'sales'
  AND indexname IN (
    'idx_sales_guest_pay_enabled',
    'idx_sales_payment_status_after_sale',
    'idx_sales_expected_next_bill_date'
  );

-- View sample data (if any sales exist)
SELECT 
  id,
  company_name,
  utility_company_phone,
  guest_pay_enabled,
  guest_pay_link,
  payment_status_after_sale,
  expected_next_bill_date
FROM public.sales
LIMIT 5;
```

## Troubleshooting

### Error: "column already exists"
This is safe to ignore - it means the column was already added. The migration uses `IF NOT EXISTS` to prevent errors.

### Error: "permission denied"
Make sure you're running the SQL as a user with ALTER TABLE permissions (usually the project owner or service role).

### Fields not showing in UI
1. Make sure you restarted your development server
2. Clear your browser cache
3. Check browser console for any errors
4. Verify the migration ran successfully

### TypeScript errors
All TypeScript types have been updated. If you see errors:
1. Restart your TypeScript server in VS Code
2. Run `npm run build` to check for build errors

## Rollback (If Needed)

If you need to remove these fields:

```sql
-- Remove the new columns
ALTER TABLE public.sales
  DROP COLUMN IF EXISTS utility_company_phone,
  DROP COLUMN IF EXISTS guest_pay_enabled,
  DROP COLUMN IF EXISTS guest_pay_link,
  DROP COLUMN IF EXISTS payment_status_after_sale,
  DROP COLUMN IF EXISTS expected_next_bill_date;

-- Remove the indexes
DROP INDEX IF EXISTS idx_sales_guest_pay_enabled;
DROP INDEX IF EXISTS idx_sales_payment_status_after_sale;
DROP INDEX IF EXISTS idx_sales_expected_next_bill_date;
```

## Summary of Changes

✅ **Database**: 5 new columns added to `sales` table
✅ **Form**: New fields added to create/edit forms
✅ **Detail View**: New fields displayed in sale details
✅ **Actions**: Backend logic updated to handle new fields
✅ **Types**: TypeScript interfaces updated
✅ **No Breaking Changes**: Fully backward compatible

All existing sales will have default values for new fields:
- `guest_pay_enabled`: `false`
- `payment_status_after_sale`: `'pending'`
- Other fields: `null`
