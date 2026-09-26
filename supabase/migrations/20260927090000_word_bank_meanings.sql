-- Vietnamese meaning + example per word, generated once by the
-- define-words Edge Function and shared by every learner (ARCHITECTURE.md
-- §1 principle 5: generated content is cached, never regenerated for free).
-- Replaces the free English dictionary API, which was slow/unreliable and
-- English-only. Written only by the service role: word_bank keeps its
-- select-only policy for learners.
alter table public.word_bank
  add column meaning_vi text,
  add column example_en text,
  add column example_vi text;
