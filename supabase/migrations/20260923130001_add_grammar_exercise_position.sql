-- Display order within a unit must not depend on insertion order / id
-- assignment (which is not guaranteed by an INSERT ... SELECT ... JOIN
-- without an explicit ORDER BY). Make it explicit instead.
alter table public.grammar_exercises add column position int not null default 0;
create index grammar_exercises_unit_position_idx on public.grammar_exercises(unit_id, position);
