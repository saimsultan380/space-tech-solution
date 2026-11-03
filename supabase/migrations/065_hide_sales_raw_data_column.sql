-- Table-level SELECT overrides a column revoke. Replace it with a column
-- grant that omits sales_raw_data. Insert and update are unchanged, so the
-- stored value is still written the same way. Reads go through
-- get_visible_sales_raw_data.

REVOKE SELECT ON TABLE public.sales FROM anon, authenticated;

GRANT SELECT (
  id,
  sale_type,
  subtype,
  customer_id,
  agent_id,
  processor_id,
  company_name,
  amount,
  discount,
  charged_amount,
  billed_month,
  next_billing_date,
  status,
  sales_notes,
  processing_notes,
  created_at,
  updated_at,
  sale_date,
  customer_phone,
  customer_name,
  customer_email,
  service_address,
  account_holder_name,
  dob,
  ssn_encrypted,
  account_status,
  other_sale_data,
  policy_holder_name,
  vehicle_details,
  payment_method,
  merchant_name,
  agent_name,
  utility_company_service_number,
  deleted_at,
  card_last_four,
  utility_company_phone,
  guest_pay_enabled,
  guest_pay_link,
  payment_status_after_sale,
  expected_next_bill_date
) ON TABLE public.sales TO anon, authenticated;
