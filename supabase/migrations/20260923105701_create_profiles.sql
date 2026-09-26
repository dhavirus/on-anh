-- ARCHITECTURE.md §3.1 — identity table, one row per auth user.
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null,
  role              text not null default 'learner',   -- 'learner' | 'owner'
  native_language   text not null default 'vi',
  target_cefr       text not null default 'A2',
  created_at        timestamptz not null default now(),

  constraint profiles_role_check check (role in ('learner', 'owner')),
  constraint profiles_target_cefr_check check (target_cefr in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
);
