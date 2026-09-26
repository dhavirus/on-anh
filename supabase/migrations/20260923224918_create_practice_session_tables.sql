-- ARCHITECTURE.md §3.4 — generated content & sessions. Writes here happen
-- server-side (Edge Functions, service role, bypasses RLS); the client
-- only reads what these policies explicitly allow.
create table public.daily_plans (
  id                    bigserial primary key,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  plan_date             date not null,
  new_word_count        int  not null,
  target_cefr           text not null,
  grammar_focus_unit_id bigint references public.grammar_units(id),
  rationale             text,
  raw_llm_response      jsonb,
  created_at            timestamptz not null default now(),

  unique (user_id, plan_date)
);

alter table public.daily_plans enable row level security;

create policy daily_plans_select on public.daily_plans
  for select
  using (user_id = auth.uid() or public.is_owner());

create table public.practice_sessions (
  id             bigserial primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  topic_id       bigint references public.topics(id),
  daily_plan_id  bigint references public.daily_plans(id),
  created_at     timestamptz not null default now()
);

alter table public.practice_sessions enable row level security;

create policy practice_sessions_select on public.practice_sessions
  for select
  using (user_id = auth.uid() or public.is_owner());

-- practice_items.correct_answer must never reach the client (§1 principle
-- 3). Deliberately no select policy for `authenticated` here: only the
-- service role (RLS-bypassing) can read this table. The client only ever
-- sees items via generate-practice's JSON response, which strips the
-- answer before returning.
create table public.practice_items (
  id              bigserial primary key,
  session_id      bigint not null references public.practice_sessions(id) on delete cascade,
  item_type       text not null,
  prompt          text not null,
  correct_answer  text not null,
  target_word_id  bigint references public.word_bank(id),
  grammar_unit_id bigint references public.grammar_units(id),
  position        int not null
);

create index practice_items_session_id_idx on public.practice_items(session_id);

alter table public.practice_items enable row level security;

create table public.practice_responses (
  id               bigserial primary key,
  item_id          bigint not null references public.practice_items(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  submitted_answer text not null,
  is_correct       boolean not null,
  graded_by        text not null,
  explanation_vi   text,
  responded_at     timestamptz not null default now(),

  constraint practice_responses_graded_by_check check (graded_by in ('exact', 'llm'))
);

alter table public.practice_responses enable row level security;

-- Read-only for learners: grading is authoritative and happens only in
-- grade-response (service role). No insert/update policy for
-- `authenticated` — a direct client insert would let a learner self-grade.
create policy practice_responses_select on public.practice_responses
  for select
  using (user_id = auth.uid() or public.is_owner());

-- Cost-tracking log (§5: "so cost is an observed number, not a guess").
-- Owner-only visibility; written exclusively by the service role.
create table public.llm_usage (
  id            bigserial primary key,
  user_id       uuid references public.profiles(id) on delete set null,
  function_name text not null,
  model         text not null,
  input_tokens  int,
  output_tokens int,
  created_at    timestamptz not null default now()
);

alter table public.llm_usage enable row level security;

create policy llm_usage_select on public.llm_usage
  for select
  using (public.is_owner());
