-- Performance: hoist row-independent auth calls in RLS policies into InitPlans.
--
-- Every policy called get_user_role() / auth.uid() directly, so Postgres re-evaluated
-- them once per scanned row. get_user_role() queries public.users, so a single
-- customers list (2.8k rows x 3 permissive policies) issued ~8.4k user lookups and
-- averaged 982ms; the same query with RLS bypassed runs in 5.8ms.
--
-- Wrapping a STABLE call in a scalar subquery makes the planner evaluate it once per
-- statement. Policy logic is otherwise rewritten byte-for-byte, so access rules are
-- unchanged. Row-dependent helpers such as is_channel_member(channel_id) are left
-- alone because they cannot be hoisted.

create table if not exists public._rls_policy_backup_20260829 as
select
  now() as backed_up_at,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public';

do $$
declare
  p record;
  v_qual text;
  v_check text;
  v_sql text;
  n int := 0;
begin
  for p in
    select tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  loop
    v_qual  := coalesce(p.qual, '');
    v_check := coalesce(p.with_check, '');

    -- Unwrap any existing scalar-subquery wrapper and drop schema qualification so
    -- the rewrite below is idempotent and safe to re-run.
    v_qual  := regexp_replace(v_qual,  '\( SELECT ([a-zA-Z_][a-zA-Z0-9_.]*\(\)) AS [a-zA-Z_][a-zA-Z0-9_]*\)', '\1', 'g');
    v_check := regexp_replace(v_check, '\( SELECT ([a-zA-Z_][a-zA-Z0-9_.]*\(\)) AS [a-zA-Z_][a-zA-Z0-9_]*\)', '\1', 'g');
    v_qual  := replace(v_qual,  'public.get_user_role()', 'get_user_role()');
    v_check := replace(v_check, 'public.get_user_role()', 'get_user_role()');

    v_qual := replace(replace(replace(v_qual,
      'get_user_role()', '(select public.get_user_role())'),
      'auth.uid()',      '(select auth.uid())'),
      'auth.role()',     '(select auth.role())');

    v_check := replace(replace(replace(v_check,
      'get_user_role()', '(select public.get_user_role())'),
      'auth.uid()',      '(select auth.uid())'),
      'auth.role()',     '(select auth.role())');

    execute format('drop policy %I on public.%I', p.policyname, p.tablename);

    v_sql := format(
      'create policy %I on public.%I as %s for %s to %s',
      p.policyname,
      p.tablename,
      p.permissive,
      p.cmd,
      array_to_string(p.roles, ', ')
    );

    if v_qual <> '' then
      v_sql := v_sql || ' using (' || v_qual || ')';
    end if;

    if v_check <> '' then
      v_sql := v_sql || ' with check (' || v_check || ')';
    end if;

    execute v_sql;
    n := n + 1;
  end loop;

  raise notice 'rewrote % RLS policies', n;
end $$;
