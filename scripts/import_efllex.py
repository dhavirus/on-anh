#!/usr/bin/env python3
"""Import EFLLex into word_bank.

Source: Durlich, L. and Francois, T., EFLLex: A Graded Lexical Resource for
Learners of English as a Foreign Language. LREC 2018. CC BY-NC-SA 4.0.
https://cental.uclouvain.be/cefrlex/efllex/

Usage:
  python3 scripts/import_efllex.py | psql "$DATABASE_URL"
  # or, against the local dev stack:
  python3 scripts/import_efllex.py | docker exec -i supabase_db_2.2.English-webpage psql -U postgres -d postgres

Emits a COPY block on stdout; does not touch the database itself.
"""
import csv
import json
import sys

SOURCE = "scripts/data/EFLLex.tsv"
LEVELS = ["a1", "a2", "b1", "b2", "c1"]

# ARCHITECTURE.md says "derive cefr_level as the lowest band where the
# lemma's normalized frequency crosses a threshold" without naming the
# threshold. 1.0 (per-million-word normalized frequency) is a first-pass
# default, not a validated cutoff. freq_profile keeps the full per-level
# distribution specifically so this can be re-tuned with a one-line change
# and a re-run of this script, no re-download needed.
THRESHOLD = 1.0


def copy_escape(value):
    """Escape a value for Postgres COPY TEXT format."""
    if value is None:
        return "\\N"
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace("\t", "\\t")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
    )


def derive_cefr_level(freqs):
    for level in LEVELS:
        if freqs[level] >= THRESHOLD:
            return level.upper()
    # Never crosses the threshold at any graded level: treat as advanced/
    # rare vocabulary rather than silently dropping the lemma.
    return "C1"


def main():
    print("COPY public.word_bank (lemma, pos, cefr_level, freq_profile) FROM STDIN;")
    seen = set()
    skipped_dupes = 0
    with open(SOURCE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            lemma = row["word"].strip()
            pos = (row.get("tag") or "").strip() or None
            if not lemma:
                continue
            key = (lemma, pos)
            if key in seen:
                skipped_dupes += 1
                continue
            seen.add(key)

            freqs = {level: float(row[f"level_freq@{level}"] or 0) for level in LEVELS}
            freqs["total"] = float(row.get("total_freq@total") or 0)
            cefr_level = derive_cefr_level(freqs)
            freq_profile = json.dumps(freqs)

            print(
                "\t".join(
                    copy_escape(v) for v in (lemma, pos, cefr_level, freq_profile)
                )
            )
    print("\\.")
    print(f"-- imported {len(seen)} lemmas, skipped {skipped_dupes} duplicate (lemma, pos) rows", file=sys.stderr)


if __name__ == "__main__":
    main()
