# Sales Fields Update - Implementation Summary

## Overview
Added new fields to the sales information and billing sections as requested:

### Sales Information Section
1. **Utility Company Phone Number** - Text field for utility company contact
2. **Guest Pay Enabled** - Toggle button to enable/disable guest payment
3. **Guest Pay Link** - URL field for guest payment portal (shown when guest pay is enabled)

### Billing Section
1. **Payment Status After Sale** - Dropdown with options: Pending, Completed, Failed, Refunded, Cancelled
2. **Expected Next Bill Date** - Date picker for the expected next billing date

## Files Modified

### 1. Database Migration
**File:** `supabase/migrations/055_add_sales_guest_pay_and_billing_fields.sql`
- Added 5 new columns to the `sales` table:
  - `utility_company_phone` (TEXT)
  - `guest_pay_enabled` (BOOLEAN, default: false)
  - `guest_pay_link` (TEXT)
  - `payment_status_after_sale` (TEXT with CHECK constraint)
  - `expected_next_bill_date` (DATE)
- Added indexes for performance optimization
- Added column comments for documentation

### 2. Sales Form Component
**File:** `src/components/sales/sale-form.tsx`
- Updated `emptyForm` object to include new fields with default values
- Added `LinkIcon` import from lucide-react
- Added new "Guest Pay" card section with:
  - Toggle switch for enabling guest pay
  - Conditional input field for guest pay link
- Updated "Billing & Amounts" section with:
  - Payment status dropdown
  - Expected next bill date picker
- Added utility company phone field in the utility details section

### 3. Sales Edit Page
**File:** `src/app/dashboard/sales/[id]/edit/page.tsx`
- Updated `initialValues` to include all new fields:
  - `utility_company_phone`
  - `guest_pay_enabled`
  - `guest_pay_link`
  - `expected_next_bill_date`
  - `payment_status_after_sale`

### 4. Sales Detail Page
**File:** `src/app/dashboard/sales/[id]/page.tsx`
- Added utility company phone display in Utility Details card
- Updated Billing card to show:
  - Payment Status After Sale (capitalized)
  - Expected Next Bill Date
- Added new "Guest Pay" card section displaying:
  - Guest Pay Enabled status (Yes/No)
  - Guest Pay Link (as clickable link when enabled)

### 5. Sales Actions
**File:** `src/lib/actions/sales.ts`
- Updated `CreateSaleInput` interface to include:
  - `utility_company_phone: string`
  - `guest_pay_enabled: boolean`
  - `guest_pay_link: string`
  - `expected_next_bill_date: string`
  - `payment_status_after_sale: string`
- Updated `createSale` function's `saleInsertPayload` to include new fields
- Updated `updateSaleDetails` function's `updatePayload` to include new fields

## Database Schema Changes

```sql
ALTER TABLE public.sales
  ADD COLUMN utility_company_phone TEXT,
  ADD COLUMN guest_pay_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN guest_pay_link TEXT,
  ADD COLUMN payment_status_after_sale TEXT CHECK (payment_status_after_sale IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')) DEFAULT 'pending',
  ADD COLUMN expected_next_bill_date DATE;
```

## UI/UX Features

### Guest Pay Toggle
- Implemented as a custom toggle switch with smooth animations
- Shows/hides the guest pay link input based on toggle state
- Visual feedback with color changes (primary color when enabled)

### Payment Status Dropdown
- Five status options: Pending, Completed, Failed, Refunded, Cancelled
- Default value: "pending"
- Properly capitalized in display views

### Field Placement
- **Utility Company Phone**: Added in the Utility Details section (only for utility sales)
- **Guest Pay Section**: New dedicated card between Utility/Insurance Details and Billing sections
- **Billing Fields**: Added at the bottom of the Billing & Amounts card

## Testing Checklist

- [ ] Run the migration: `055_add_sales_guest_pay_and_billing_fields.sql`
- [ ] Create a new utility sale and verify all new fields are saved
- [ ] Edit an existing sale and verify new fields can be updated
- [ ] View sale details and verify all new fields display correctly
- [ ] Test guest pay toggle functionality
- [ ] Verify guest pay link is clickable and opens in new tab
- [ ] Test payment status dropdown with all options
- [ ] Verify date pickers work correctly for expected next bill date
- [ ] Test with insurance sales (guest pay and utility phone should not show)
- [ ] Verify existing sales without new fields display gracefully (with "—" or default values)

## Notes

- All new fields are optional (nullable in database) except `guest_pay_enabled` which defaults to `false`
- The `payment_status_after_sale` field has a CHECK constraint to ensure only valid statuses are stored
- Guest pay link input only appears when guest pay is enabled
- Utility company phone only appears for utility-type sales
- All changes are backward compatible with existing sales records
- Proper indexes added for performance on frequently queried fields

## Migration Instructions

1. Apply the database migration:
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or run the SQL file directly in Supabase dashboard
   ```

2. Restart your development server to pick up the changes:
   ```bash
   npm run dev
   ```

3. Test the new fields in both create and edit modes

## Rollback Plan

If needed, the migration can be rolled back with:

```sql
ALTER TABLE public.sales
  DROP COLUMN IF EXISTS utility_company_phone,
  DROP COLUMN IF EXISTS guest_pay_enabled,
  DROP COLUMN IF EXISTS guest_pay_link,
  DROP COLUMN IF EXISTS payment_status_after_sale,
  DROP COLUMN IF EXISTS expected_next_bill_date;
```
