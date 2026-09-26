-- ARCHITECTURE.md §3.2 — shared content tables, read-only to learners.
create table public.topics (
  id          bigserial primary key,
  slug        text unique not null,
  name_en     text not null,
  name_vi     text not null,
  cefr_hint   text
);

create table public.word_bank (
  id           bigserial primary key,
  lemma        text not null,
  pos          text,
  cefr_level   text not null,
  freq_profile jsonb,

  constraint word_bank_cefr_level_check check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  unique (lemma, pos)
);

create table public.word_topics (
  word_id   bigint references public.word_bank(id) on delete cascade,
  topic_id  bigint references public.topics(id) on delete cascade,
  primary key (word_id, topic_id)
);

create index word_topics_topic_id_idx on public.word_topics(topic_id);
