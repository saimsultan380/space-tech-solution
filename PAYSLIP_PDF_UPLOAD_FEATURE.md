# Payslip PDF Upload Feature

## Overview

This feature allows administrators to upload old/historical payslips in PDF format and assign them to team members. The uploaded PDFs are stored securely in Supabase Storage and can be viewed by both admins and the assigned employees.

## Key Features

### 1. **PDF Upload in Payslip Form**
- Admins can upload PDF files when creating or editing payslips
- File validation: Only PDF files, max 10MB size
- Files are stored in Supabase Storage under `payslip-pdfs` bucket
- File path format: `{user_id}/{timestamp}_{filename}.pdf`

### 2. **Secure Storage**
- PDFs are stored in a private Supabase Storage bucket
- Access is controlled via Row Level Security (RLS) policies
- Super admins have full access to all PDFs
- Employees can only access their own payslip PDFs

### 3. **Seamless Integration**
- Uploaded PDFs appear alongside system-generated payslips
- PDF icon indicates when a payslip has an uploaded PDF
- Both uploaded and generated PDFs can coexist in the system

### 4. **Employee Access**
- Employees can view uploaded PDFs from their "My Payslips" portal
- Signed URLs are generated for secure, time-limited access (1 hour)
- PDFs open in a new browser tab for viewing

## Database Changes

### Migration: `058_add_payslip_pdf_upload.sql`

**New Column:**
```sql
ALTER TABLE public.payslips
ADD COLUMN pdf_url TEXT;
```

**Storage Bucket:**
- Bucket name: `payslip-pdfs`
- Privacy: Private (requires authentication)
- File size limit: 10MB
- Allowed types: `application/pdf` only

**Storage Policies:**
1. Super admins can upload PDFs
2. Super admins can view all PDFs
3. Users can view their own PDFs (based on file path)
4. Super admins can delete PDFs

## API Changes

### New Server Actions (`src/lib/actions/payslips.ts`)

#### `uploadPayslipPdf(formData: FormData)`
Uploads a PDF file to Supabase Storage.

**Parameters:**
- `formData.file`: The PDF file to upload
- `formData.userId`: The user ID to associate with the file

**Returns:**
```typescript
{
  path: string;        // Storage path
  fullPath: string;    // Full path including user folder
}
```

**Validation:**
- Requires `super_admin` role
- Only PDF files allowed
- Maximum file size: 10MB
- Generates unique filename with timestamp

#### `deletePayslipPdf(filePath: string)`
Deletes a PDF file from Supabase Storage.

**Parameters:**
- `filePath`: The storage path of the file to delete

**Returns:**
```typescript
{ success: boolean }
```

#### `getPayslipPdfUrl(filePath: string)`
Generates a signed URL for viewing a PDF.

**Parameters:**
- `filePath`: The storage path of the file

**Returns:**
- Signed URL (valid for 1 hour)

**Security:**
- Super admins can access any PDF
- Regular users can only access their own PDFs

### Updated Actions

#### `createPayslip(input: CreatePayslipInput)`
Now accepts optional `pdf_url` field to associate an uploaded PDF with the payslip.

#### `updatePayslip(input: UpdatePayslipInput)`
Now accepts optional `pdf_url` field to update or add a PDF to an existing payslip.

## UI Changes

### 1. Payslip Form Dialog (`payslip-form-dialog.tsx`)

**New UI Elements:**
- PDF upload section with drag-and-drop style upload area
- File preview showing uploaded file name and size
- Remove button to delete uploaded file
- Upload progress indicator

**Features:**
- Only allows PDF files
- Shows file size validation
- Requires employee selection before upload
- Displays previously uploaded PDFs in edit mode

**Upload Flow:**
1. Admin selects an employee
2. Admin clicks upload area or drags PDF file
3. File is validated (type and size)
4. File name and size are displayed
5. On form submit, file is uploaded first, then payslip is saved with PDF URL

### 2. Admin Payslip List (`payslips-admin-client.tsx`)

**New Features:**
- New "PDF" column in the table
- Blue PDF icon appears for payslips with uploaded PDFs
- Clicking the icon opens the uploaded PDF in a new tab

**Actions Menu Updates:**
- Shows "View Uploaded PDF" option if PDF exists
- Shows "Preview PDF" for system-generated payslips
- Shows "Download Generated PDF" for creating PDF from data

### 3. Employee Payslip View (`payslips-my-client.tsx`)

**New Features:**
- Shows blue PDF icon for uploaded payslips
- Clicking icon opens uploaded PDF in new tab
- Falls back to generated PDF preview/download if no upload exists

## User Workflow

### For Admins (Uploading Old Payslips)

1. **Navigate to Payslips:**
   - Go to Dashboard → Payslips
   - Click "Generate Payslip" button

2. **Fill Payslip Information:**
   - Select the employee from dropdown
   - Enter period dates (start, end, pay date)
   - Fill in salary details (basic salary, allowances, etc.)
   - Fill in employee details (if needed)

3. **Upload PDF:**
   - Scroll to "Upload Existing Payslip PDF" section
   - Click the upload area
   - Select a PDF file from computer (max 10MB)
   - File name and size will be displayed

4. **Save Payslip:**
   - Review all information
   - Click "Save Payslip" or "Update Payslip"
   - The file will be uploaded first, then payslip record is created

5. **View Results:**
   - The payslip will appear in the list with a blue PDF icon
   - Click the PDF icon to view the uploaded file
   - The employee will now see this payslip in their portal

### For Employees (Viewing Payslips)

1. **Navigate to My Payslips:**
   - Go to Dashboard → My Payslips
   - View list of all your payslips

2. **View Uploaded PDFs:**
   - Payslips with uploaded PDFs show a blue PDF icon
   - Click the PDF icon to view the uploaded payslip
   - PDF opens in a new browser tab

3. **View Generated PDFs:**
   - Payslips without uploads show "PDF" and download buttons
   - Click "PDF" to preview system-generated payslip
   - Click download icon to save generated PDF

## Security Considerations

### File Storage
- All PDFs are stored in a private bucket (not publicly accessible)
- Access requires authentication and authorization
- Files are organized by user ID in folders

### Access Control
- Super admins: Full access to all PDFs
- Employees: Can only access their own PDFs
- File path structure prevents unauthorized access
- Signed URLs expire after 1 hour

### File Validation
- Only PDF files are allowed (MIME type check)
- Maximum file size: 10MB
- Filename sanitization to prevent injection attacks
- Unique filenames using timestamp to prevent collisions

### Row Level Security
- Storage policies enforce user-based access control
- Users cannot access other users' PDFs
- Admins have full CRUD access to all files

## Technical Implementation Details

### File Path Structure
```
payslip-pdfs/
  ├── {user_id_1}/
  │   ├── 1234567890_payslip_jan_2023.pdf
  │   └── 1234567891_payslip_feb_2023.pdf
  ├── {user_id_2}/
  │   └── 1234567892_payslip_jan_2023.pdf
```

### Signed URL Generation
- URLs are generated on-demand when viewing
- Valid for 3600 seconds (1 hour)
- Prevents long-term exposure of file paths

### Database Schema
```typescript
interface Payslip {
  // ... existing fields
  pdf_url?: string | null;  // Storage path to uploaded PDF
}
```

### Type Definitions
Updated `src/lib/types.ts` to include `pdf_url` field in Payslip interface.

## Best Practices

### For Admins

1. **Uploading Old Payslips:**
   - Use consistent file naming (e.g., "Payslip_Jan_2023.pdf")
   - Ensure PDFs are in the same format as generated payslips
   - Verify employee selection before upload
   - Double-check period dates match the PDF content

2. **File Management:**
   - Keep PDF files under 10MB (compress if needed)
   - Use clear, descriptive filenames
   - Upload PDFs immediately after filling in details
   - Remove and re-upload if wrong file selected

3. **Data Integrity:**
   - Ensure salary amounts match the PDF content
   - Verify period dates are correct
   - Mark status as "paid" if payment was completed
   - Add notes if there are any discrepancies

### For Developers

1. **Error Handling:**
   - Always catch upload errors and show user-friendly messages
   - Validate file type and size on both client and server
   - Handle storage quota errors gracefully

2. **Performance:**
   - Generate signed URLs only when needed
   - Cache signed URLs on client (valid for 1 hour)
   - Optimize PDF file sizes before upload

3. **Security:**
   - Never expose storage paths to clients
   - Always use signed URLs for file access
   - Validate user permissions before file operations
   - Sanitize filenames to prevent injection

## Troubleshooting

### Common Issues

**Issue: Upload fails with "Only PDF files are allowed"**
- Solution: Ensure file has `.pdf` extension and is a valid PDF

**Issue: Upload fails with "File size must be less than 10MB"**
- Solution: Compress the PDF file using online tools or PDF software

**Issue: "Unauthorized access to this payslip" when viewing**
- Solution: Ensure user is logged in and viewing their own payslip

**Issue: "Failed to generate URL"**
- Solution: Check if file path is correct and file exists in storage

**Issue: PDF not showing after upload**
- Solution: Refresh the page; check if upload completed successfully

## Migration Instructions

### Running the Migration

1. **Apply the migration:**
   ```bash
   # If using Supabase CLI
   supabase migration up

   # Or apply via Supabase Dashboard
   # Go to Database → Migrations → Run migration
   ```

2. **Verify storage bucket:**
   - Go to Supabase Dashboard → Storage
   - Verify `payslip-pdfs` bucket exists
   - Check that policies are created

3. **Test upload:**
   - Create a test payslip with PDF upload
   - Verify file appears in storage
   - Test viewing from admin and employee perspectives

### Rollback (if needed)

```sql
-- Remove the column
ALTER TABLE public.payslips DROP COLUMN IF EXISTS pdf_url;

-- Remove the storage bucket
DELETE FROM storage.buckets WHERE id = 'payslip-pdfs';

-- Remove storage policies
DROP POLICY IF EXISTS "Super admins can upload payslip PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can view all payslip PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payslip PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete payslip PDFs" ON storage.objects;

-- Remove index
DROP INDEX IF EXISTS idx_payslips_pdf_url;
```

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Upload:**
   - Upload multiple PDFs at once
   - Automatic employee matching based on filename patterns
   - CSV mapping file for batch uploads

2. **PDF Preview:**
   - Show PDF preview in the form dialog
   - Inline PDF viewer instead of new tab

3. **Version Control:**
   - Keep history of uploaded PDFs
   - Allow multiple versions per payslip
   - Show upload history with timestamps

4. **Automatic OCR:**
   - Extract data from uploaded PDFs
   - Auto-fill form fields from PDF content
   - Verify data consistency

5. **Storage Management:**
   - Admin dashboard for storage usage
   - Cleanup old files
   - Compression options

6. **Notifications:**
   - Notify employees when PDF is uploaded
   - Email notification with PDF attached

## Support

For issues or questions:
1. Check this documentation first
2. Review error messages in browser console
3. Check Supabase Dashboard → Storage for file presence
4. Verify database migration was applied successfully
5. Contact system administrator for access issues

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Migration:** 058_add_payslip_pdf_upload.sql
