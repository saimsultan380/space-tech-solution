-- ============================================
-- Add PDF upload support for payslips
-- ============================================

-- Add pdf_url column to payslips table to store uploaded PDF files
ALTER TABLE public.payslips
ADD COLUMN pdf_url TEXT;

-- Create storage bucket for payslip PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payslip-pdfs',
  'payslip-pdfs',
  false, -- Private bucket - only accessible via signed URLs or policies
  10485760, -- 10MB file size limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payslip PDFs
-- Super admins can upload payslip PDFs
CREATE POLICY "Super admins can upload payslip PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payslip-pdfs' 
    AND public.get_user_role() = 'super_admin'
  );

-- Super admins can view all payslip PDFs
CREATE POLICY "Super admins can view all payslip PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payslip-pdfs' 
    AND public.get_user_role() = 'super_admin'
  );

-- Users can view their own payslip PDFs
-- Path format: {user_id}/{filename}
CREATE POLICY "Users can view their own payslip PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payslip-pdfs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Super admins can delete payslip PDFs
CREATE POLICY "Super admins can delete payslip PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payslip-pdfs' 
    AND public.get_user_role() = 'super_admin'
  );

-- Add index for pdf_url lookups
CREATE INDEX idx_payslips_pdf_url ON public.payslips(pdf_url) WHERE pdf_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.payslips.pdf_url IS 'Storage path for uploaded payslip PDF file';
