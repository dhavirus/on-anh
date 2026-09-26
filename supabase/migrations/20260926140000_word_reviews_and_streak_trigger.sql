-- 1. word_reviews: log of flashcard self-grades. Without it, spec §5's
--    "vocab retention = correct reviews / total reviews" had no data and
--    flashcard study was invisible to plan-day, weekly stats and charts.
--    Learner-written (the flashcard flow is client-side, as in M2), so a
--    learner could only ever skew their own numbers.
create table public.word_reviews (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  word_id     bigint not null references public.word_bank(id),
  quality     smallint not null check (quality between 0 and 5),
  reviewed_at timestamptz not null default now()
);

create index word_reviews_user_time_idx on public.word_reviews (user_id, reviewed_at);

alter table public.word_reviews enable row level security;

create policy word_reviews_select on public.word_reviews
  for select
  using (user_id = auth.uid() or public.is_owner());

-- Immutable log: insert only.
create policy word_reviews_insert on public.word_reviews
  for insert
  with check (user_id = auth.uid());

-- 2. §6 streak rule, applied once in the database for every graded item:
--    LLM practice, grammar exercises and flashcard reviews. Previously only
--    grade-response (LLM practice) bumped the streak. Uses the learner's
--    own calendar day (profiles.timezone).
create function public.bump_streak() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  today date;
  s     user_streaks%rowtype;
  n     int;
begin
  select (now() at time zone timezone)::date into today from profiles where id = new.user_id;

  select * into s from user_streaks where user_id = new.user_id for update;
  if found and s.last_active_date = today then
    return new;
  end if;

  n := case when found and s.last_active_date = today - 1 then s.current_streak + 1 else 1 end;

  insert into user_streaks (user_id, current_streak, longest_streak, last_active_date)
  values (new.user_id, n, greatest(n, coalesce(s.longest_streak, 0)), today)
  on conflict (user_id) do update
    set current_streak   = excluded.current_streak,
        longest_streak   = excluded.longest_streak,
        last_active_date = excluded.last_active_date;
  return new;
end;
$$;

revoke execute on function public.bump_streak() from public, anon, authenticated;

create trigger practice_responses_bump_streak after insert on public.practice_responses
  for each row execute function public.bump_streak();
create trigger exercise_attempts_bump_streak after insert on public.exercise_attempts
  for each row execute function public.bump_streak();
create trigger word_reviews_bump_streak after insert on public.word_reviews
  for each row execute function public.bump_streak();

-- The trigger is now the only writer: learners must not set their own streak.
drop policy user_streaks_insert on public.user_streaks;
drop policy user_streaks_update on public.user_streaks;

-- 3. weekly_stats: add flashcard reviews (passed = quality >= 3, SM-2's
--    pass mark) and count them toward active days.
create or replace function public.weekly_stats(p_user uuid, p_start date, p_end date)
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
  ),
  wr as (
    select w.quality >= 3 as passed, w.reviewed_at as at
    from word_reviews w, b
    where w.user_id = p_user and w.reviewed_at >= b.lo and w.reviewed_at < b.hi
  )
  select jsonb_build_object(
    'practice_answered', (select count(*) from pr),
    'practice_correct',  (select count(*) from pr where is_correct),
    'grammar_attempts',  (select count(*) from ga),
    'grammar_correct',   (select count(*) from ga where is_correct),
    'flashcard_reviews', (select count(*) from wr),
    'flashcard_passed',  (select count(*) from wr where passed),
    'words_added', (
      select count(*) from user_word_progress w, b
      where w.user_id = p_user and w.added_at >= b.lo and w.added_at < b.hi),
    'active_days', (
      select count(distinct (at at time zone b.tz)::date)
      from (select at from pr union all select at from ga union all select at from wr) x, b),
    'grammar_by_unit', coalesce((
      select jsonb_agg(jsonb_build_object(
               'unit', u.title_en, 'attempts', n, 'correct', c) order by u.order_index)
      from (select unit_id, count(*) n, count(*) filter (where is_correct) c
            from ga group by unit_id) g
      join grammar_units u on u.id = g.unit_id), '[]'::jsonb)
  )
$$;
