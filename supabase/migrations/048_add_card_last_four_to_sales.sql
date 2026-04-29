-- ============================================================
-- 048: Add card_last_four to sales table
-- ============================================================

-- 1. Add the column to the sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS card_last_four TEXT;

-- 2. Create an index for searching
CREATE INDEX IF NOT EXISTS idx_sales_card_last_four ON public.sales(card_last_four);

-- 3. Populate existing records from the payments table
-- We take the card_last_four from the latest payment associated with each sale
UPDATE public.sales s
SET card_last_four = p.card_last_four
FROM (
  SELECT DISTINCT ON (sale_id) sale_id, card_last_four
  FROM public.payments
  WHERE method = 'card'
  ORDER BY sale_id, created_at DESC
) p
WHERE s.id = p.sale_id AND s.card_last_four IS NULL;
