# English learning app — architecture

A private English-learning web app for a small group (owner + a few learners).
Learners are Vietnamese L1; all feedback and explanations are written in Vietnamese.

Inspired by WordPecker (topic-driven vocabulary + spaced repetition), extended with a
separate grammar track whose learned points feed back into vocabulary practice.

---

## 1. Design principles

These are load-bearing. Violating them is a bug, not a style choice.

1. **No secrets in the browser.** The frontend is a public static site. Only the Supabase
   anon key lives there. Every LLM API key lives in Supabase Edge Function secrets.
2. **Grading is deterministic first.** Correctness is decided by normalized exact match
   against a stored answer. The LLM is a *fallback judge* for near-misses and the *author*
   of explanations — never the primary source of truth for a score. Scores feed analytics;
   hallucinated verdicts would corrupt them silently.
3. **The client never sees answers before grading.** `correct_answer` is stripped from
   any payload returned to the browser. Grading happens in an Edge Function.
4. **LLM decisions are bounded and clamped.** The model may choose the next day's
   difficulty, but it returns structured JSON with a fixed schema, and server code clamps
   every field to a safe range before it is persisted.
5. **Generated content is cached, never regenerated for free.** One login = at most one
   planning call. Practice generation is explicit and user-initiated.
6. **All instructional content is original.** Grammar syllabus *structure* follows the
   conventional grouping (tenses → modals → conditionals → passive → reported speech →
   articles/nouns → relative clauses → prepositions). Explanations and exercises are
   written fresh for this project. Do not copy text, examples, or exercises from any
   published textbook.
7. **Two weights of state:** learner-owned rows (progress, responses) are RLS-protected
   per user. Content rows (word bank, topics, grammar units, exercises) are shared and
   read-only to learners.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Plain HTML/CSS/JS on GitHub Pages | No framework unless justified. Hand-rolled SVG for charts. |
| Database | Supabase Postgres | Row-level security on every user-owned table. |
| Auth | Supabase Auth (email + password) | Small closed group; no social login needed. |
| Server logic | Supabase Edge Functions (Deno, TypeScript) | Holds LLM keys, does grading, writes progress. |
| File storage | Supabase Storage | Word images only (deferred to v2). |
| Scheduling | Supabase cron → Edge Function | Weekly insight job. |

No Express server, no container, nothing to keep running.

---

## 3. Data model

### 3.1 Identity

```sql
profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null,
  role              text not null default 'learner',   -- 'learner' | 'owner'
  native_language   text not null default 'vi',
  target_cefr       text not null default 'A2',        -- current working level
  created_at        timestamptz not null default now()
)
```

### 3.2 Content (shared, read-only to learners)

```sql
topics (
  id          bigserial primary key,
  slug        text unique not null,
  name_en     text not null,
  name_vi     text not null,
  cefr_hint   text                                  -- rough level of the topic overall
)

word_bank (
  id           bigserial primary key,
  lemma        text not null,
  pos          text,                                -- part of speech
  cefr_level   text not null,                       -- A1..C2, derived from EFLLex
  freq_profile jsonb,                               -- raw per-level frequencies
  unique (lemma, pos)
)

word_topics (
  word_id   bigint references word_bank(id) on delete cascade,
  topic_id  bigint references topics(id) on delete cascade,
  primary key (word_id, topic_id)
)

grammar_units (
  id             bigserial primary key,
  order_index    int not null unique,
  title_en       text not null,
  title_vi       text not null,
  topic_area     text not null,                     -- 'tenses', 'modals', ...
  cefr_level     text not null,
  explanation_md text not null                      -- ORIGINAL content, written by us
)

grammar_exercises (
  id             bigserial primary key,
  unit_id        bigint not null references grammar_units(id) on delete cascade,
  exercise_type  text not null,                     -- fill_blank | multiple_choice
                                                    -- | error_spotting | transformation
  prompt         text not null,
  choices        jsonb,                             -- null for free-text types
  correct_answer text not null,
  explanation_vi text not null
)
```

**Word bank source:** EFLLex (Dürlich & François, LREC 2018), ~15k English lemmas with
per-CEFR-level frequency distributions, CC BY-NC-SA 4.0. Non-commercial use with
attribution — fits this project. Import once via a seed script; derive `cefr_level` as the
lowest band where the lemma's normalized frequency crosses a threshold. Keep the full
distribution in `freq_profile` so the rule can be re-tuned without re-importing.

**Topic tagging** is a one-time batch job (LLM pass over the lemma list, then manual
spot-check), not a runtime cost. Start with ~10 topics rather than tagging all 15k lemmas.

### 3.3 Learner progress (RLS-protected)

```sql
user_word_progress (
  id              bigserial primary key,
  user_id         uuid not null references profiles(id) on delete cascade,
  word_id         bigint not null references word_bank(id),
  ease_factor     real not null default 2.5,         -- SM-2
  interval_days   int  not null default 0,
  repetitions     int  not null default 0,
  lapses          int  not null default 0,
  next_review_date date not null default current_date,
  source_topic_id bigint references topics(id),
  added_at        timestamptz not null default now(),
  unique (user_id, word_id)
)

exercise_attempts (
  id               bigserial primary key,
  user_id          uuid not null references profiles(id) on delete cascade,
  exercise_id      bigint not null references grammar_exercises(id),
  submitted_answer text not null,
  is_correct       boolean not null,
  attempted_at     timestamptz not null default now()
)

unit_mastery (
  user_id         uuid not null references profiles(id) on delete cascade,
  unit_id         bigint not null references grammar_units(id),
  attempts        int not null default 0,
  correct         int not null default 0,
  rolling_accuracy real not null default 0,
  unlocked        boolean not null default false,    -- >= 0.8 accuracy over >= 5 attempts
  updated_at      timestamptz not null default now(),
  primary key (user_id, unit_id)
)

user_streaks (
  user_id         uuid primary key references profiles(id) on delete cascade,
  current_streak  int not null default 0,
  longest_streak  int not null default 0,
  last_active_date date
)
```

### 3.4 Generated content & sessions

```sql
daily_plans (
  id                    bigserial primary key,
  user_id               uuid not null references profiles(id) on delete cascade,
  plan_date             date not null,
  new_word_count        int  not null,
  target_cefr           text not null,
  grammar_focus_unit_id bigint references grammar_units(id),
  rationale             text,                        -- LLM's short reason, for debugging
  raw_llm_response      jsonb,                       -- pre-clamp, for auditing
  created_at            timestamptz not null default now(),
  unique (user_id, plan_date)                        -- idempotency: one plan per day
)

practice_sessions (
  id             bigserial primary key,
  user_id        uuid not null references profiles(id) on delete cascade,
  topic_id       bigint references topics(id),
  daily_plan_id  bigint references daily_plans(id),
  created_at     timestamptz not null default now()
)

practice_items (
  id              bigserial primary key,
  session_id      bigint not null references practice_sessions(id) on delete cascade,
  item_type       text not null,                     -- fill_blank | reorder | short_answer
  prompt          text not null,
  correct_answer  text not null,                     -- NEVER sent to the client
  target_word_id  bigint references word_bank(id),
  grammar_unit_id bigint references grammar_units(id),
  position        int not null
)

practice_responses (
  id               bigserial primary key,
  item_id          bigint not null references practice_items(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  submitted_answer text not null,
  is_correct       boolean not null,
  graded_by        text not null,                    -- 'exact' | 'llm'
  explanation_vi   text,
  responded_at     timestamptz not null default now()
)

progress_insights (
  id           bigserial primary key,
  user_id      uuid not null references profiles(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  stats        jsonb not null,                       -- the deterministic numbers
  summary_vi   text not null,
  created_at   timestamptz not null default now()
)

llm_usage (
  id            bigserial primary key,
  user_id       uuid references profiles(id) on delete set null,
  function_name text not null,
  model         text not null,
  input_tokens  int,
  output_tokens int,
  created_at    timestamptz not null default now()
)
```

`llm_usage` exists so cost is an observed number, not a guess. Log every call.

### 3.5 Deferred to v2 — word images

```sql
word_images (
  word_id      bigint primary key references word_bank(id) on delete cascade,
  image_url    text not null,
  source       text not null,        -- 'stock' | 'generated'
  generated_at timestamptz not null default now()
)
```

Hybrid strategy: try a free stock-photo API first (concrete nouns resolve there), fall back
to paid image generation only on a miss (abstractions, idioms). Cache permanently — a word
reviewed 40 times over a year must cost at most one generation.

---

## 4. Row-level security

Every table in §3.3 and §3.4 gets: learners can `select`/`insert`/`update` only rows where
`user_id = auth.uid()`. Content tables in §3.2 are `select`-only for all authenticated users.

The owner role needs to read learner progress. **Do not write a policy that queries
`profiles` directly from inside a `profiles` policy** — that recurses and Postgres will
error. Use a `security definer` helper:

```sql
create function public.is_owner() returns boolean
language sql security definer stable
as $$ select exists (
  select 1 from public.profiles where id = auth.uid() and role = 'owner'
) $$;
```

Then policies read `user_id = auth.uid() or public.is_owner()`.

**Verify RLS with two real accounts before building any feature on top of it.** A missing
policy is invisible until it isn't.

---

## 5. Edge Functions

All four hold the LLM key server-side and log to `llm_usage`.

### `plan-day`
Called once when a learner opens the app for the first time that day.

1. If `daily_plans` already has a row for (user, today), return it. No LLM call.
2. Otherwise compute deterministic stats: per-unit accuracy, vocab retention rate
   (correct reviews / total reviews over 14 days), current streak, words due today.
3. Send stats to the LLM. Required response shape:
   ```json
   { "new_word_count": 3, "cefr_delta": 0,
     "grammar_focus_unit_id": 12, "rationale": "..." }
   ```
4. **Clamp before persisting:** `new_word_count` → 1..5; `cefr_delta` → -1..+1 and at most
   one level change per 7 days; `grammar_focus_unit_id` must be an unlocked unit for this
   user, else fall back to the lowest-accuracy unlocked unit. Store the raw response in
   `raw_llm_response` so bad decisions are debuggable.

### `generate-practice`
Called when the learner picks a topic and asks for exercises. Explicitly user-initiated —
this is the "generate a new set" button.

1. Select target words: due reviews from `user_word_progress` + `new_word_count` unseen
   words from the chosen topic at the plan's `target_cefr`.
2. Select grammar constraints: units where `unit_mastery.unlocked = true`. New grammar never
   appears in vocabulary practice before the learner has passed it on the grammar page.
3. One LLM call → items combining the target words with the unlocked grammar points, each
   with its correct answer.
4. Persist `practice_session` + `practice_items`. Return items to the client
   **with `correct_answer` stripped**.

### `grade-response`
Called on each submitted answer.

1. Normalize both sides (trim, casefold, collapse whitespace, expand contractions,
   strip terminal punctuation). Exact match → correct, `graded_by = 'exact'`.
2. On mismatch, one LLM call acting as judge: is this a valid alternative phrasing?
   `graded_by = 'llm'`.
3. Always generate a short Vietnamese explanation referencing what the learner actually
   typed versus the expected form. Steps 2 and 3 can share one call.
4. Write `practice_responses`; update `user_word_progress` via SM-2; update
   `user_streaks`.

### `weekly-insight`
Cron, weekly. Computes the same deterministic stats over 7 days, has the LLM write a plain
Vietnamese summary of what is improving and what is stuck, writes `progress_insights`.
This one is reporting only — it does not change scheduling.

---

## 6. Scheduling logic (deterministic, no LLM)

**SM-2 spaced repetition** on `user_word_progress`, graded again / hard / good / easy:

- quality < 3 → `repetitions = 0`, `interval_days = 1`, `lapses += 1`
- else → `repetitions += 1`; interval = 1 (first), 6 (second), else `round(prev * ease)`
- `ease_factor += 0.1 - (5-q) * (0.08 + (5-q) * 0.02)`, floor at 1.3
- `next_review_date = current_date + interval_days`

**Grammar unlock:** a unit becomes `unlocked` at ≥80% rolling accuracy over ≥5 attempts.
Unlocked units are the pool `generate-practice` draws grammar constraints from.

**Streak:** counts on *completing at least one graded item*, not on login. Increments when
`last_active_date` is yesterday, resets to 1 on a longer gap, no-ops if already today.

---

## 7. Build order

- **M0 — Foundation.** Supabase project, `profiles`, auth, RLS policies. Verify isolation
  with two accounts. Nothing else until this is proven.
- **M1 — Word bank.** Import EFLLex, define topics, tag a starter set of ~10 topics.
- **M2 — Vocabulary loop.** Topic picker → add words → SM-2 review UI → progress persists.
  No LLM yet; manual definitions or a free dictionary API.
- **M3 — Grammar track.** `grammar_units` + `grammar_exercises` authored for the first
  ~10 units. Grammar page, deterministic client-side scoring, `unit_mastery` updates.
- **M4 — Generation + grading.** `generate-practice` and `grade-response`. This is where
  the LLM enters. Vietnamese explanations.
- **M5 — Adaptive difficulty.** `plan-day` with clamping. Streak UI.
- **M6 — Analytics.** `weekly-insight`, owner dashboard, progress charts.
- **v2 — Word images.** Stock-first hybrid with permanent caching.

---

## 8. Open decisions

- Which CEFR bands EFLLex actually ships (C2 may be absent) — check the file, adjust the
  `target_cefr` ladder if it tops out at C1.
- How many grammar units to author before launch. Ten is enough to start; the full
  conventional syllabus is ~100+.
- Whether the owner dashboard shows per-learner detail or aggregate only.
- Whether learners can add their own words outside a topic (WordPecker's original
  "capture from what you're reading" flow) — currently out of scope for v1.
