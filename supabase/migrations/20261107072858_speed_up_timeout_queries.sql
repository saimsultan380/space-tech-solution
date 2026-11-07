-- Stop PostgREST "Thread killed by timeout manager" stalls.
--
-- Those errors fire when a request holds a database connection too long and the
-- pool runs out. Two hot paths did that:
--   1. get_filtered_sales_stats ran a correlated chargebacks lookup per sale.
--   2. processing-account stats issued six separate count queries per page load.
--
-- The sales function returns the same JSON (verified against live data before
-- this migration). The new counts function is security invoker, so RLS still
-- applies and the numbers match the old per-status counts.

create or replace function public.get_filtered_sales_stats(
  p_sale_type text default null,
  p_agent_id uuid default null,
  p_from_date timestamptz default null,
  p_to_date timestamptz default null,
  p_search text default null
)
returns json
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  result json;
  safe_search text;
  like_pat text;
  numeric_val numeric;
  has_numeric boolean := false;
  from_day date;
  to_day date;
begin
  from_day := (p_from_date at time zone 'UTC')::date;
  to_day := (p_to_date at time zone 'UTC')::date;

  if p_search is not null and length(trim(p_search)) > 0 then
    safe_search := trim(p_search);
    like_pat := '%' || replace(replace(replace(safe_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    begin
      numeric_val := nullif(regexp_replace(safe_search, '[^0-9.\-]', '', 'g'), '')::numeric;
      has_numeric := numeric_val is not null
        and length(regexp_replace(safe_search, '[^0-9.\-]', '', 'g')) > 0;
    exception when others then
      has_numeric := false;
      numeric_val := null;
    end;
  end if;

  select json_build_object(
    'total_records', count(*)::int,
    'total_amount', coalesce(sum(s.amount), 0)::numeric,
    'gross_charged_amount', coalesce(sum(s.charged_amount), 0)::numeric,
    'chargeback_impacted_amount', coalesce(sum(s.charged_amount) filter (where cb.sale_id is not null), 0)::numeric,
    'utility_count', count(*) filter (where s.sale_type = 'utility')::int,
    'insurance_count', count(*) filter (where s.sale_type = 'insurance')::int
  )
  into result
  from sales s
  left join (select distinct sale_id from chargebacks) cb on cb.sale_id = s.id
  where s.deleted_at is null
    and (p_sale_type is null or p_sale_type = 'all' or s.sale_type = p_sale_type)
    and (p_agent_id is null or s.agent_id = p_agent_id)
    and (from_day is null or s.sale_date >= from_day)
    and (to_day is null or s.sale_date <= to_day)
    and (
      like_pat is null
      or s.customer_name ilike like_pat escape '\'
      or s.customer_email ilike like_pat escape '\'
      or s.customer_phone ilike like_pat escape '\'
      or s.company_name ilike like_pat escape '\'
      or s.utility_company_service_number ilike like_pat escape '\'
      or s.policy_holder_name ilike like_pat escape '\'
      or s.account_holder_name ilike like_pat escape '\'
      or s.card_last_four ilike like_pat escape '\'
      or (has_numeric and (s.amount = numeric_val or s.charged_amount = numeric_val))
    );

  return result;
end;
$function$;

create or replace function public.get_processing_account_counts(
  p_account_type text default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns json
language sql
stable
security invoker
set search_path to 'public'
as $$
  select json_build_object(
    'total', count(*)::int,
    'active', count(*) filter (where status = 'active')::int,
    'not_working', count(*) filter (where status = 'not_working')::int,
    'closed', count(*) filter (where status = 'closed')::int,
    'reversal_issue', count(*) filter (where status = 'reversal_issue')::int,
    'under_review', count(*) filter (where status = 'under_review')::int
  )
  from processing_accounts
  where (p_account_type is null or p_account_type = 'all' or account_type = p_account_type)
    and (p_from is null or created_at >= p_from)
    and (p_to is null or created_at <= p_to);
$$;

grant execute on function public.get_processing_account_counts(text, timestamptz, timestamptz) to authenticated, service_role;

create index if not exists idx_notifications_user_type_created
  on public.notifications (user_id, type, created_at desc);
