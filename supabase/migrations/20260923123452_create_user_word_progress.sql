-- ARCHITECTURE.md §3.3 — learner-owned SM-2 progress, one row per
-- (user, word). RLS-protected: a learner sees and writes only their own.
create table public.user_word_progress (
  id                bigserial primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  word_id           bigint not null references public.word_bank(id),
  ease_factor       real not null default 2.5,
  interval_days     int  not null default 0,
  repetitions       int  not null default 0,
  lapses            int  not null default 0,
  next_review_date  date not null default current_date,
  source_topic_id   bigint references public.topics(id),
  added_at          timestamptz not null default now(),

  unique (user_id, word_id)
);

create index user_word_progress_due_idx
  on public.user_word_progress (user_id, next_review_date);

alter table public.user_word_progress enable row level security;

create policy user_word_progress_select on public.user_word_progress
  for select
  using (user_id = auth.uid() or public.is_owner());

create policy user_word_progress_insert on public.user_word_progress
  for insert
  with check (user_id = auth.uid());

create policy user_word_progress_update on public.user_word_progress
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
