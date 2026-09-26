-- ARCHITECTURE.md §4 — a policy on profiles cannot query profiles
-- directly (it recurses); this security-definer helper breaks the cycle.
create function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  )
$$;
