alter table public.profiles enable row level security;

-- Learners see their own row; the owner sees everyone's.
create policy profiles_select on public.profiles
  for select
  using (id = auth.uid() or public.is_owner());

-- No insert/update/delete policy for authenticated users in M0:
-- rows are created only by the handle_new_user trigger (runs as the
-- table owner, so it bypasses RLS). role and target_cefr must not be
-- self-editable, so direct client writes stay blocked until there is
-- a narrower, explicit path for the fields learners should be able to
-- change (e.g. display_name via a dedicated RPC).
