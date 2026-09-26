-- ARCHITECTURE.md §3.2 — grammar content, shared and read-only to learners.
-- topic_area is free text (doc lists a conventional set but keeps it
-- open-ended with "...", so no check constraint here).
create table public.grammar_units (
  id             bigserial primary key,
  order_index    int not null unique,
  title_en       text not null,
  title_vi       text not null,
  topic_area     text not null,
  cefr_level     text not null,
  explanation_md text not null,

  constraint grammar_units_cefr_level_check check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
);

create table public.grammar_exercises (
  id             bigserial primary key,
  unit_id        bigint not null references public.grammar_units(id) on delete cascade,
  exercise_type  text not null,
  prompt         text not null,
  choices        jsonb,
  correct_answer text not null,
  explanation_vi text not null,

  constraint grammar_exercises_type_check
    check (exercise_type in ('fill_blank', 'multiple_choice', 'error_spotting', 'transformation'))
);

create index grammar_exercises_unit_id_idx on public.grammar_exercises(unit_id);

alter table public.grammar_units enable row level security;
alter table public.grammar_exercises enable row level security;

create policy grammar_units_select on public.grammar_units
  for select to authenticated using (true);

create policy grammar_exercises_select on public.grammar_exercises
  for select to authenticated using (true);

-- ARCHITECTURE.md §3.3 — learner-owned mastery tracking. Unlike profiles,
-- no field here can be abused for privilege escalation, so a plain
-- own-row policy (matching §4's general rule) is safe as-is.
create table public.unit_mastery (
  user_id          uuid not null references public.profiles(id) on delete cascade,
  unit_id          bigint not null references public.grammar_units(id),
  attempts         int not null default 0,
  correct          int not null default 0,
  rolling_accuracy real not null default 0,
  unlocked         boolean not null default false,
  updated_at       timestamptz not null default now(),

  primary key (user_id, unit_id)
);

alter table public.unit_mastery enable row level security;

create policy unit_mastery_select on public.unit_mastery
  for select
  using (user_id = auth.uid() or public.is_owner());

create policy unit_mastery_insert on public.unit_mastery
  for insert
  with check (user_id = auth.uid());

create policy unit_mastery_update on public.unit_mastery
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
