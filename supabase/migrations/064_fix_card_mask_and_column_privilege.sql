-- Trim separators after a card number so "4111 1111 1111 1111 " still masks,
-- and take SELECT on the raw-data column away from API roles.

CREATE OR REPLACE FUNCTION public.mask_payment_card_numbers(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  src text := COALESCE(input, '');
  i int := 1;
  n int := length(src);
  digits text;
  chunk text;
  ch text;
  out text := '';
  separators text := ' ' || chr(9) || '-';
BEGIN
  IF src = '' THEN
    RETURN '';
  END IF;

  WHILE i <= n LOOP
    IF substring(src, i, 1) ~ '[0-9]' THEN
      digits := '';
      chunk := '';
      WHILE i <= n AND (
        substring(src, i, 1) ~ '[0-9]'
        OR position(substring(src, i, 1) in separators) > 0
      ) LOOP
        ch := substring(src, i, 1);
        chunk := chunk || ch;
        IF ch ~ '[0-9]' THEN
          digits := digits || ch;
        END IF;
        i := i + 1;
        IF length(digits) > 19 THEN
          EXIT;
        END IF;
      END LOOP;
      DECLARE
        trimmed boolean := false;
      BEGIN
        WHILE length(chunk) > 0 AND substring(chunk, length(chunk), 1) !~ '[0-9]' LOOP
          chunk := left(chunk, -1);
          i := i - 1;
          trimmed := true;
        END LOOP;
        IF trimmed THEN
          i := i + 1;
        END IF;
      END;
      IF length(digits) BETWEEN 13 AND 19
         AND substring(chunk, 1, 1) ~ '[0-9]'
         AND substring(chunk, length(chunk), 1) ~ '[0-9]' THEN
        out := out || '**** **** **** ' || right(digits, 4);
      ELSE
        out := out || chunk;
      END IF;
    ELSE
      out := out || substring(src, i, 1);
      i := i + 1;
    END IF;
  END LOOP;

  RETURN out;
END;
$$;

REVOKE SELECT (sales_raw_data) ON TABLE public.sales FROM PUBLIC, anon, authenticated;
