# How to Apply the Payslip PDF Upload Migration

## Quick Start

This migration adds the ability to upload PDF payslips and store them securely in Supabase Storage.

## Prerequisites

- ✅ Supabase project set up and running
- ✅ Database connection working
- ✅ Admin access to Supabase dashboard

## Method 1: Using Supabase Dashboard (Recommended for Production)

### Step 1: Navigate to SQL Editor
1. Open your Supabase Dashboard
2. Go to **SQL Editor** from the left sidebar
3. Click **New Query**

### Step 2: Run the Migration
1. Copy the entire contents of `supabase/migrations/058_add_payslip_pdf_upload.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press Ctrl/Cmd + Enter)

### Step 3: Verify Success
You should see:
```
Success. No rows returned
```

### Step 4: Verify Storage Bucket
1. Go to **Storage** in the left sidebar
2. You should see a new bucket called `payslip-pdfs`
3. Click on it to verify it was created with correct settings

### Step 5: Verify Table Changes
1. Go to **Table Editor** → **payslips**
2. Scroll to the right
3. You should see a new column called `pdf_url` (type: TEXT)

## Method 2: Using Supabase CLI

### Step 1: Install Supabase CLI (if not already)
```bash
npm install -g supabase
```

### Step 2: Link Your Project
```bash
supabase link --project-ref your-project-ref
```

### Step 3: Run Migration
```bash
supabase db push
```

This will apply all pending migrations including the new one.

### Step 4: Verify
```bash
supabase db diff
```

Should show no differences if migration applied successfully.

## Method 3: Direct SQL (For Local Development)

If you're running Supabase locally:

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/058_add_payslip_pdf_upload.sql
```

## Verification Steps

### 1. Check Database Column
Run this query in SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payslips' 
AND column_name = 'pdf_url';
```

Expected result:
```
column_name | data_type
------------+----------
pdf_url     | text
```

### 2. Check Storage Bucket
Run this query:
```sql
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'payslip-pdfs';
```

Expected result:
```
id            | name          | public | file_size_limit
--------------+---------------+--------+-----------------
payslip-pdfs  | payslip-pdfs  | false  | 10485760
```

### 3. Check Storage Policies
Run this query:
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%payslip%';
```

Expected result should show 4 policies:
```
Super admins can upload payslip PDFs
Super admins can view all payslip PDFs
Users can view their own payslip PDFs
Super admins can delete payslip PDFs
```

### 4. Check Index
Run this query:
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'payslips' 
AND indexname = 'idx_payslips_pdf_url';
```

Expected result:
```
indexname
----------------------
idx_payslips_pdf_url
```

## Testing the Feature

After migration, test the feature:

### Test 1: Upload a PDF (Admin)
1. Login as super admin
2. Go to Dashboard → Payslips
3. Click "Generate Payslip"
4. Select an employee
5. Fill in details
6. Upload a test PDF file
7. Save payslip
8. Verify PDF icon appears

### Test 2: View PDF (Admin)
1. Click the blue PDF icon in payslip list
2. PDF should open in new tab
3. Verify it's the correct file

### Test 3: View as Employee
1. Logout and login as the employee
2. Go to "My Payslips"
3. Find the payslip with uploaded PDF
4. Click the PDF icon
5. Verify it opens correctly

### Test 4: Access Control
1. Login as Employee A
2. Try to access Employee B's payslip
3. Should get "Unauthorized access" error
4. This confirms security is working

## Troubleshooting

### Error: "relation already exists"
**Cause:** Migration was already applied  
**Solution:** This is okay, the column already exists

### Error: "duplicate key value violates unique constraint"
**Cause:** Storage bucket already exists  
**Solution:** This is okay, bucket was already created

### Error: "permission denied for schema storage"
**Cause:** User doesn't have storage permissions  
**Solution:** Run as admin user or use Supabase Dashboard

### Storage bucket not showing
**Cause:** Migration didn't complete  
**Solution:** 
1. Check SQL Editor for errors
2. Re-run the migration
3. Manually create bucket via Storage UI if needed

### Policies not working
**Cause:** RLS not enabled or policies not created  
**Solution:**
1. Verify RLS is enabled on storage.objects
2. Re-run policy creation statements
3. Check policy names match exactly

## Manual Bucket Creation (If Needed)

If the storage bucket wasn't created automatically:

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Enter these settings:
   - **Name:** `payslip-pdfs`
   - **Public:** OFF (unchecked)
   - **File size limit:** `10485760` (10MB)
   - **Allowed MIME types:** `application/pdf`
4. Click **Create Bucket**

## Manual Policy Creation (If Needed)

If policies weren't created, run these in SQL Editor:

```sql
-- Super admins can upload
CREATE POLICY "Super admins can upload payslip PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payslip-pdfs' 
    AND public.get_user_role() = 'super_admin'
  );

-- Super admins can view all
CREATE POLICY "Super admins can view all payslip PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payslip-pdfs' 
    AND public.get_user_role() = 'super_admin'
  );

-- Users can view their own
CREATE POLICY "Users can view their own payslip PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payslip-pdfs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Super admins can delete
CREATE POLICY "Super admins can delete payslip PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payslip-pdfs' 
    AND public.get_user_role() = 'super_admin'
  );
```

## Rollback Instructions

If you need to undo this migration:

```sql
-- Remove column
ALTER TABLE public.payslips DROP COLUMN IF EXISTS pdf_url;

-- Remove index
DROP INDEX IF EXISTS idx_payslips_pdf_url;

-- Remove policies
DROP POLICY IF EXISTS "Super admins can upload payslip PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can view all payslip PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payslip PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete payslip PDFs" ON storage.objects;

-- Remove bucket (Warning: This will delete all files!)
DELETE FROM storage.buckets WHERE id = 'payslip-pdfs';
```

⚠️ **Warning:** Rollback will delete all uploaded PDF files!

## After Migration

1. ✅ Deploy the updated application code
2. ✅ Test upload functionality
3. ✅ Monitor storage usage
4. ✅ Train admins on how to use the feature
5. ✅ Share the Quick Guide with users

## Need Help?

- Check the full documentation: `PAYSLIP_PDF_UPLOAD_FEATURE.md`
- User guide: `PAYSLIP_UPLOAD_QUICK_GUIDE.md`
- Summary: `PAYSLIP_PDF_UPLOAD_SUMMARY.md`

## Success Checklist

- [ ] Migration SQL ran without errors
- [ ] `pdf_url` column exists in payslips table
- [ ] `payslip-pdfs` storage bucket exists
- [ ] 4 storage policies are created
- [ ] Index `idx_payslips_pdf_url` exists
- [ ] Can upload PDF as admin
- [ ] Can view PDF as admin
- [ ] Can view own PDF as employee
- [ ] Cannot view other's PDF as employee
- [ ] Application deployed with new code

---

**Migration File:** `058_add_payslip_pdf_upload.sql`  
**Estimated Time:** 2-5 minutes  
**Risk Level:** Low (backward compatible)
