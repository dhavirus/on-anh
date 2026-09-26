-- ARCHITECTURE.md §4 — content tables are shared and read-only to learners.
-- No insert/update/delete policy for authenticated users: content is
-- maintained via migrations/seed scripts and the service role, not by
-- learners at runtime.
alter table public.topics enable row level security;
alter table public.word_bank enable row level security;
alter table public.word_topics enable row level security;

create policy topics_select on public.topics
  for select
  to authenticated
  using (true);

create policy word_bank_select on public.word_bank
  for select
  to authenticated
  using (true);

create policy word_topics_select on public.word_topics
  for select
  to authenticated
  using (true);
