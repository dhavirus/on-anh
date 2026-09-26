-- ARCHITECTURE.md §3.3 — two learner-owned tables that were missed when
-- M3 shipped: exercise_attempts (individual grammar-exercise attempt
-- log; unit_mastery aggregates were being updated without ever writing
-- the underlying log rows) and user_streaks (needed by grade-response,
-- M4, and by §6's streak rule).
create table public.exercise_attempts (
  id               bigserial primary key,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  exercise_id      bigint not null references public.grammar_exercises(id),
  submitted_answer text not null,
  is_correct       boolean not null,
  attempted_at     timestamptz not null default now()
);

create index exercise_attempts_user_id_idx on public.exercise_attempts(user_id);

alter table public.exercise_attempts enable row level security;

create policy exercise_attempts_select on public.exercise_attempts
  for select
  using (user_id = auth.uid() or public.is_owner());

-- Attempts are an immutable log: insert only, no update/delete policy.
create policy exercise_attempts_insert on public.exercise_attempts
  for insert
  with check (user_id = auth.uid());

create table public.user_streaks (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  current_streak  int not null default 0,
  longest_streak  int not null default 0,
  last_active_date date
);

alter table public.user_streaks enable row level security;

create policy user_streaks_select on public.user_streaks
  for select
  using (user_id = auth.uid() or public.is_owner());

create policy user_streaks_insert on public.user_streaks
  for insert
  with check (user_id = auth.uid());

create policy user_streaks_update on public.user_streaks
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
