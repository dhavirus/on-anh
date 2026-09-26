# Kickoff prompt for Claude Code

Paste the block below into a fresh Claude Code session, in a directory containing
`ARCHITECTURE.md`.

---

I'm building a private English-learning web app for a few family members and friends.
`ARCHITECTURE.md` in this directory is the full spec — read it first and treat it as the
source of truth. Ask me before deviating from it.

**Context about me:** I'm a computational chemist, comfortable with Python and scientific
computing, less experienced with web frontend and Postgres RLS. Explain web-specific
decisions briefly; don't explain general programming.

**Stack:** static HTML/CSS/JS on GitHub Pages, Supabase (Postgres + Auth + Edge Functions
+ Storage). No frontend framework unless you can justify it. No Express server.

**Non-negotiable constraints from the spec:**

- No API keys in client-side code. LLM keys live only in Edge Function secrets.
- `correct_answer` is never sent to the browser. Grading happens server-side.
- Answer correctness is decided by normalized exact match first; the LLM is only a
  fallback judge for near-misses and the author of explanations.
- Any LLM output that drives behaviour returns fixed-schema JSON and gets clamped in code
  before it is persisted.
- All grammar explanations and exercises must be original content written for this
  project. The syllabus *ordering* follows the conventional grammar sequence, but do not
  reproduce text, examples, or exercises from any published textbook.
- Learner-facing explanations are in Vietnamese.

**Start with M0 only** (from §7 of the spec): Supabase project setup, the `profiles`
table, auth wiring, and RLS policies. Do not build features on top of RLS until we have
verified with two separate test accounts that one user cannot read another's rows. Note
the `security definer` helper in §4 — the naive owner-role policy recurses.

**Working style I want:**

- Migrations as numbered SQL files in `supabase/migrations/`, never ad-hoc SQL run by hand.
- One concern per commit.
- Before writing a nontrivial chunk, tell me what you're about to do in two or three lines
  and let me object.
- If something in the spec looks wrong or underspecified once you're in the code, say so
  rather than silently patching around it.
- Flag anything that would cost money at runtime so I can see it coming.

Begin by reading `ARCHITECTURE.md` and telling me what you think is underspecified or
risky in M0 before you write any code.
