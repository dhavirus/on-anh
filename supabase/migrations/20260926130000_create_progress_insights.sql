-- ARCHITECTURE.md §3.4 progress_insights + M6 weekly stats.
-- Written only by weekly-insight (service role); learners read their own,
-- the owner reads everyone's. unique(user_id, period_start) is not in the
-- spec: it makes the weekly job idempotent (a re-run can't double-write
-- or double-pay for an LLM call).
create table public.progress_insights (
  id           bigserial primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  stats        jsonb not null,
  summary_vi   text not null,
  created_at   timestamptz not null default now(),

  unique (user_id, period_start)
);

alter table public.progress_insights enable row level security;

create policy progress_insights_select on public.progress_insights
  for select
  using (user_id = auth.uid() or public.is_owner());

-- Deterministic stats for one learner over [p_start, p_end] in the
-- learner's own calendar (profiles.timezone). Service role only: it takes
-- an arbitrary user id, so learners must not be able to call it.
create function public.weekly_stats(p_user uuid, p_start date, p_end date)
returns jsonb
language sql stable
set search_path = public
as $$
  with b as (
    select timezone as tz,
           p_start::timestamp at time zone timezone as lo,
           (p_end + 1)::timestamp at time zone timezone as hi
    from profiles where id = p_user
  ),
  pr as (
    select r.is_correct, r.responded_at as at
    from practice_responses r, b
    where r.user_id = p_user and r.responded_at >= b.lo and r.responded_at < b.hi
  ),
  ga as (
    select a.is_correct, a.attempted_at as at, e.unit_id
    from exercise_attempts a join grammar_exercises e on e.id = a.exercise_id, b
    where a.user_id = p_user and a.attempted_at >= b.lo and a.attempted_at < b.hi
  )
  select jsonb_build_object(
    'practice_answered', (select count(*) from pr),
    'practice_correct',  (select count(*) from pr where is_correct),
    'grammar_attempts',  (select count(*) from ga),
    'grammar_correct',   (select count(*) from ga where is_correct),
    'words_added', (
      select count(*) from user_word_progress w, b
      where w.user_id = p_user and w.added_at >= b.lo and w.added_at < b.hi),
    'active_days', (
      select count(distinct (at at time zone b.tz)::date)
      from (select at from pr union all select at from ga) x, b),
    'grammar_by_unit', coalesce((
      select jsonb_agg(jsonb_build_object(
               'unit', u.title_en, 'attempts', n, 'correct', c) order by u.order_index)
      from (select unit_id, count(*) n, count(*) filter (where is_correct) c
            from ga group by unit_id) g
      join grammar_units u on u.id = g.unit_id), '[]'::jsonb)
  )
$$;

revoke execute on function public.weekly_stats(uuid, date, date) from public, anon, authenticated;
grant execute on function public.weekly_stats(uuid, date, date) to service_role;
