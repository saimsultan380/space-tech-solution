-- Migration 080: Fix account number masking in sales raw data
-- Ensure customer account numbers (e.g. Optimum, Spectrum, utility, telecom, policy, bank accounts)
-- are NOT masked with asterisks. Only payment card numbers (credit/debit cards) should be masked.

-- 1. Helper function to verify Luhn checksum (standard for all credit/debit cards)
CREATE OR REPLACE FUNCTION public.luhn_verify(p_digits text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_len int := length(p_digits);
  v_sum int := 0;
  v_alt boolean := false;
  v_d int;
  v_i int;
BEGIN
  IF v_len < 13 OR v_len > 19 THEN
    RETURN false;
  END IF;
  FOR v_i IN REVERSE v_len..1 LOOP
    v_d := substring(p_digits, v_i, 1)::int;
    IF v_alt THEN
      v_d := v_d * 2;
      IF v_d > 9 THEN
        v_d := v_d - 9;
      END IF;
    END IF;
    v_sum := v_sum + v_d;
    v_alt := NOT v_alt;
  END LOOP;
  RETURN (v_sum % 10 = 0);
END;
$$;

-- 2. Helper function to check if digits match standard Major Industry Identifier / Card Network BINs
CREATE OR REPLACE FUNCTION public.is_payment_card_bin(p_digits text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_digits IS NULL OR length(p_digits) < 13 OR length(p_digits) > 19 THEN
    RETURN false;
  END IF;

  -- Visa (starts with 4, len 13, 16, 19)
  IF p_digits ~ '^4[0-9]{12}([0-9]{3})?([0-9]{3})?$' THEN
    RETURN true;
  END IF;

  -- Mastercard (51-55 or 2221-2720, len 16)
  IF length(p_digits) = 16 AND (
    p_digits ~ '^5[1-5][0-9]{14}$'
    OR substring(p_digits, 1, 4)::int BETWEEN 2221 AND 2720
  ) THEN
    RETURN true;
  END IF;

  -- Amex (34 or 37, len 15)
  IF p_digits ~ '^3[47][0-9]{13}$' THEN
    RETURN true;
  END IF;

  -- Discover (6011, 622126-622925, 644-649, 65, len 16)
  IF length(p_digits) = 16 AND (
    p_digits ~ '^(6011|65[0-9]{2}|64[4-9][0-9])[0-9]{12}$'
    OR substring(p_digits, 1, 6)::int BETWEEN 622126 AND 622925
  ) THEN
    RETURN true;
  END IF;

  -- Diners Club (300-305, 36, 38, len 14-16)
  IF p_digits ~ '^(30[0-5]|36[0-9]|38[0-9])[0-9]{11,13}$' THEN
    RETURN true;
  END IF;

  -- JCB (3528-3589, len 16)
  IF length(p_digits) = 16 AND (
    substring(p_digits, 1, 4)::int BETWEEN 3528 AND 3589
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 3. Updated mask_payment_card_numbers:
-- Context-aware: inspects the preceding line/label to avoid masking client account numbers,
-- service numbers, policy numbers, or bank account numbers.
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
  chunk_start int;
  lookback_start int;
  raw_pre text;
  clean_pre text;
  line_pre text;
  is_non_card boolean;
  is_card boolean;
  should_mask boolean;
BEGIN
  IF src = '' THEN
    RETURN '';
  END IF;

  WHILE i <= n LOOP
    IF substring(src, i, 1) ~ '[0-9]' THEN
      chunk_start := i;
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

      should_mask := false;

      IF length(digits) BETWEEN 13 AND 19
         AND substring(chunk, 1, 1) ~ '[0-9]'
         AND substring(chunk, length(chunk), 1) ~ '[0-9]' THEN
        -- Inspect up to 120 characters before chunk_start to check label context
        lookback_start := GREATEST(1, chunk_start - 120);
        raw_pre := substring(src, lookback_start, chunk_start - lookback_start);

        -- Convert HTML breaks to newlines and strip tags
        clean_pre := regexp_replace(raw_pre, '(?i)<br\s*/?>|<\/?(p|div|tr|li)[^>]*>', E'\n', 'g');
        clean_pre := regexp_replace(clean_pre, '<[^>]+>', ' ', 'g');

        -- Get the current line segment immediately preceding the number
        line_pre := lower(regexp_replace(clean_pre, '.*[\r\n]', ''));

        -- Check if explicitly labeled as non-card account/service/policy/bank number
        is_non_card := (
          line_pre ~* '\m(account|acct|policy|service|routing|ssn|social|phone|mobile|cell|imei|tracking|license|dl|invoice|order)\M'
          AND line_pre !~* '\m(credit\s*card|debit\s*card|card\s*number|card\s*no|card\s*#|cc\s*number|cc\s*no|cc\s*#|ccn)\M'
        );

        -- Check if explicitly labeled as credit/debit card
        is_card := (
          line_pre ~* '\m(card|credit|debit|cc|visa|mastercard|master\s*card|amex|american\s*express|discover)\M'
          AND line_pre !~* '\m(bank|checking|savings|utility|policy)\M'
        );

        IF is_non_card THEN
          should_mask := false;
        ELSIF is_card THEN
          should_mask := true;
        ELSE
          -- Unlabeled: only mask if it matches a known card BIN and satisfies Luhn checksum
          should_mask := (
            public.is_payment_card_bin(digits)
            AND public.luhn_verify(digits)
          );
        END IF;
      END IF;

      IF should_mask THEN
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

GRANT EXECUTE ON FUNCTION public.luhn_verify(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_payment_card_bin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_payment_card_numbers(text) TO authenticated;
