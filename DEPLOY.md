# Deploying

Static site on GitHub Pages + a hosted Supabase project. Run top to bottom once.
Steps marked **(you)** need a browser or your credentials; the rest are commands.

## 0. Cost guard (you)

- **Anthropic console → Settings → Limits:** set a monthly spend limit (e.g. $5). It is the
  one hard ceiling on LLM cost, whatever the code does.
- **Supabase free plan pauses a project after ~7 days with no API traffic.** A paused project
  means the site can't log in and the weekly cron doesn't run; un-pause from the dashboard.
  Regular use by learners keeps it awake.

## 1. Supabase project

1. **(you)** supabase.com → New project. Region: **Southeast Asia (Singapore)** (closest to
   Vietnam). Save the database password.
2. Log in and link (the login opens a browser):
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT-REF>
   ```
3. Schema + starter content (topics, 10 grammar units and exercises from `seed.sql`):
   ```bash
   npx supabase db push --include-seed
   ```
4. Word bank. `DATABASE_URL` is Dashboard → Connect → **Session pooler** URI. No local `psql`,
   so this borrows the one inside the local Supabase DB container (`npx supabase start` first):
   ```bash
   export DATABASE_URL='<paste the Session pooler URI, with your DB password filled in>'
   PSQL="docker exec -i supabase_db_2.2.English-webpage psql $DATABASE_URL"
   python3 scripts/import_efllex.py | $PSQL
   python3 scripts/tag_topics.py   | $PSQL
   ```
5. Edge Function secrets, then deploy all four functions:
   ```bash
   CRON_SECRET=$(openssl rand -hex 24); echo "$CRON_SECRET"   # keep it for step 6
   npx supabase secrets set ANTHROPIC_API_KEY=<key> CRON_SECRET=$CRON_SECRET
   npx supabase functions deploy
   ```
6. **(you)** Dashboard → SQL editor, for the weekly cron (values differ per environment, so
   they are not in a migration). Paste the CRON_SECRET echoed in step 5:
   ```sql
   select vault.create_secret('https://<PROJECT-REF>.supabase.co/functions/v1/weekly-insight', 'weekly_insight_url');
   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
   ```
7. **(you)** Dashboard → Authentication:
   - Sign In / Providers → turn **off** "Allow new users to sign up".
   - URL Configuration → Site URL = `https://<github-user>.github.io/<repo>/`.
   - Users → **Add user** for yourself and each learner (email + password, "Auto confirm").
     Display name defaults to the part of the email before `@`.
8. **(you)** SQL editor: make yourself owner and set display names:
   ```sql
   update profiles set role = 'owner' where id = (select id from auth.users where email = '<you>');
   update profiles set display_name = '<Tên>' where id = (select id from auth.users where email = '<learner>');
   ```

## 2. Point the site at the project

Fill the non-local branch of `config.js` with Dashboard → Project Settings → API
(Project URL and the **anon / publishable** key; never the service-role key). Commit it.

## 3. GitHub Pages

A private repo can only use Pages on a paid GitHub plan. The repo holds no secrets
(`supabase/functions/.env` is gitignored), so public is fine for this app.

```bash
gh repo create <repo> --public --source=. --push
gh api -X POST repos/<github-user>/<repo>/pages -f "source[branch]=main" -f "source[path]=/"
```

The site appears at `https://<github-user>.github.io/<repo>/` within a minute or two.

## 4. Smoke test

- Log in as a learner → the daily plan chip appears (`plan-day` works, key is valid).
- Open a topic → "Tạo bài luyện tập" → answer one item (`generate-practice`, `grade-response`).
- SQL editor: `select jobname, schedule from cron.job;` shows `weekly-insight`.
- `select function_name, count(*), sum(input_tokens + output_tokens) from llm_usage group by 1;`
  is where to watch cost.
