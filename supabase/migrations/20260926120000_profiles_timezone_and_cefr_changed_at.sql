-- M5: streak/plan "today" must follow the learner's calendar, not UTC
-- (Vietnam is UTC+7, so UTC midnight = 07:00 local). cefr_changed_at
-- backs plan-day's "at most one CEFR level change per 7 days" clamp
-- (ARCHITECTURE.md §5), which needs to know when the level last moved.
-- Both columns are written only by service-role code; profiles still has
-- no authenticated update policy.
alter table public.profiles
  add column timezone text not null default 'Asia/Ho_Chi_Minh',
  add column cefr_changed_at timestamptz;
