-- Copy each sale's account number out of the stored raw text when the
-- service-number column is empty, so the sales list can show it without
-- reading the raw card text.

UPDATE public.sales
SET utility_company_service_number = btrim(
  substring(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(sales_raw_data, ''), '<[^>]+>', ' ', 'g'),
        '&nbsp;|&#160;|&#xa0;',
        ' ',
        'gi'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
    from 'Account Number ?: ?([0-9][0-9-]{3,})'
  ),
  '-'
)
WHERE deleted_at IS NULL
  AND coalesce(trim(utility_company_service_number), '') = ''
  AND substring(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(sales_raw_data, ''), '<[^>]+>', ' ', 'g'),
        '&nbsp;|&#160;|&#xa0;',
        ' ',
        'gi'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
    from 'Account Number ?: ?([0-9][0-9-]{3,})'
  ) IS NOT NULL;
