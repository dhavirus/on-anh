-- Self-check for public.bump_streak() (ARCHITECTURE.md §6). Rolls back.
-- Run: docker exec -i $(docker ps --format '{{.Names}}' | grep supabase_db) psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/streak_trigger_test.sql
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000057e1'::uuid, 'streak-test@local')
  on conflict do nothing;

do $$
declare
  u uuid := '00000000-0000-0000-0000-0000000057e1'::uuid;
  w bigint := (select min(id) from word_bank);
  ex bigint := (select min(id) from grammar_exercises);
  today date := (select (now() at time zone timezone)::date from profiles where id = u);
  r user_streaks%rowtype;
begin
  -- first ever graded item -> 1
  insert into word_reviews (user_id, word_id, quality) values (u, w, 4);
  select * into r from user_streaks where user_id = u;
  assert r.current_streak = 1 and r.last_active_date = today, 'first item starts streak at 1';

  -- same day, different table -> unchanged
  insert into exercise_attempts (user_id, exercise_id, submitted_answer, is_correct) values (u, ex, 'x', false);
  select * into r from user_streaks where user_id = u;
  assert r.current_streak = 1, 'same day does not increment';

  -- last active yesterday -> +1, longest follows
  update user_streaks set current_streak = 4, longest_streak = 4, last_active_date = today - 1 where user_id = u;
  insert into word_reviews (user_id, word_id, quality) values (u, w, 1);
  select * into r from user_streaks where user_id = u;
  assert r.current_streak = 5 and r.longest_streak = 5, 'yesterday increments';

  -- gap of 2+ days -> reset to 1, longest kept
  update user_streaks set last_active_date = today - 2 where user_id = u;
  insert into word_reviews (user_id, word_id, quality) values (u, w, 5);
  select * into r from user_streaks where user_id = u;
  assert r.current_streak = 1 and r.longest_streak = 5, 'gap resets, longest kept';

  raise notice 'streak trigger: all checks passed';
end $$;

rollback;
