-- Add type column to notes table to support categorized notes
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('other', 'sales', 'processing'));

-- Create index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_notes_type ON public.notes(type);

-- Migrate existing notes from sales table to notes table
-- For other_sale_data
INSERT INTO public.notes (sale_id, user_id, content, type, created_at)
SELECT id, agent_id, other_sale_data, 'other', created_at
FROM public.sales
WHERE other_sale_data IS NOT NULL AND other_sale_data <> '';

-- For sales_notes
INSERT INTO public.notes (sale_id, user_id, content, type, created_at)
SELECT id, agent_id, sales_notes, 'sales', created_at
FROM public.sales
WHERE sales_notes IS NOT NULL AND sales_notes <> '';

-- For processing_notes
INSERT INTO public.notes (sale_id, user_id, content, type, created_at)
SELECT id, COALESCE(processor_id, agent_id), processing_notes, 'processing', created_at
FROM public.sales
WHERE processing_notes IS NOT NULL AND processing_notes <> '';
