# ATA CRM

SaaS CRM project for a B2B company trading raw food ingredients.

## Structure
- `supabase/`: SQL migrations and schema assets
- `web/`: Next.js application (frontend + API routes)
- `docs/`: reports, diagrams, and demo checklist
- `.github/workflows/ci.yml`: quality + coverage + E2E gates

## Main Features
- Direct login entry (`/` redirects to `/login`) for faster operational access
- Authentication (login, signup, reset) + roles (`admin`, `manager`, `commercial`, `standard_user`)
- Dedicated password reset flow (`/auth/callback?next=/reset-password`) with in-app update form
- Friendly auth errors for invalid credentials and reset email rate-limit cooldown
- Full i18n UI with language switch (`en`, `fr`) for delivery scope
- Persian locale is archived in this defense version (no active FA switch / RTL)
- Help Center (`/help`) with onboarding steps, role guide, and FAQ
- In-app tips (dismissible, persisted in local storage)
- Global search in shell (leads/companies/contacts)
- Full CRUD with edit support for `contacts`, `companies`, `leads`, `tasks`
- Full CRUD for `products` with traded/potential relationship buckets
- Company-product links with specific model/grade tracking (per traded/potential relation)
- Product-driven customer finder with traded/potential company suggestions + quick lead creation
- Company contact agents (1-3 ranked agents per company for priority follow-up)
- Product workspace tabs (List / New Product / Relations / Customer Finder) for cleaner navigation
- Company workspace tabs (List / New Company) for cleaner navigation
- Contact workspace tabs (List / New Contact) for cleaner navigation
- Leads workspace tabs (Pipeline / List / New Lead) for cleaner navigation
- Tasks workspace tabs (List / Calendar / New Task) for cleaner navigation
- Company role model (`supplier`, `customer`, `both`)
- Sales pipeline with stage change, quick move, and history
- Multi-criteria filters on leads/tasks/contacts/companies
- Prefix-based smart suggestions (top 5) on name search inputs
- Company role filter is exact (`supplier` / `customer` / `both`)
- Saved filters for leads and tasks
- KPI dashboard (7/30/90 days) + funnel + leaderboard + stage aging
- Task planning with monthly calendar + deadline alerts (overdue / due soon)
- Manual email + test email + logs + 72h follow-up
- Email analytics (open/click counts and rates)
- Idempotent automation jobs with DB locks + `dry_run` mode
- Export reports in CSV/PDF from dashboard
- Real-time notifications (Supabase Realtime + polling fallback)
- BI-ready secured KPI endpoint (`/api/bi/kpis`)
- Dockerized runtime (`Dockerfile` + `docker-compose.yml`)

## Main APIs
- `GET/POST /api/contacts`
- `PATCH/DELETE /api/contacts/:id`
- `GET/POST /api/companies`
- `PATCH/DELETE /api/companies/:id`
- `GET /api/colleagues`
- `GET /api/colleagues/:id`
- `GET/POST /api/leads`
- `PATCH/DELETE /api/leads/:id`
- `POST /api/leads/:id/stage`
- `GET/POST /api/tasks`
- `PATCH/DELETE /api/tasks/:id`
- `GET/POST /api/products`
- `PATCH/DELETE /api/products/:id`
- `POST /api/products/:id/links`
- `PATCH/DELETE /api/products/:id/links/:linkId`
- `GET /api/dashboard?range=7d|30d|90d`
- `GET /api/exports/report?format=csv|pdf&range=7d|30d|90d`
- `GET /api/bi/kpis?range=7d|30d|90d` (requires `BI_API_KEY`)
- `POST /api/emails/send`
- `GET /api/emails/logs`
- `GET/PATCH /api/profile/me`
- `PATCH /api/settings/users`
- `POST /api/jobs/followup?dry_run=true`
- `POST /api/jobs/task-reminders?dry_run=true`
- `POST /api/webhooks/brevo`

## Useful Query Params
- `GET /api/leads`: `stage_id`, `status`, `assigned_to`, `source`, `q`, `from`, `to`
- `GET /api/tasks`: `status`, `priority`, `overdue`, `from`, `to`, `q`
- `GET /api/contacts`: `q`, `company_id`
- `GET /api/companies`: `q`, `sector`, `company_role`
- `GET /api/products`: `q`, `category`, `is_active`, `relation_type`

## Local Setup
1. Copy secrets into `web/.env.local`
   - Recommended source: `C:\dev\crm-secrets.env`
2. Install dependencies:
```bash
cd C:\dev\crm-food-trading
npm ci
```
3. Apply Supabase migrations (linked project):
```bash
npx -y supabase@latest db push
```
4. Run the app:
```bash
npm run dev
```

## One-Click Start (Windows)
Use one of these options from `C:\dev\crm-food-trading`:

1. Double-click:
- `open-crm.bat`

2. Terminal command:
```bash
npm run start:oneclick
```

What it does automatically:
- checks `node` and `npm`
- creates `web/.env.local` from `C:\dev\crm-secrets.env` if needed
- installs dependencies if missing
- starts the app and opens `http://127.0.0.1:3000/login`

Useful flags:
```bash
npm run start:oneclick -- --RunHealth
npm run start:oneclick -- --NoBrowser
npm run start:oneclick -- --ForceInstall
npm run start:oneclick -- --DryRun
```

## Environment Variables
Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `BREVO_API_KEY`
- `BREVO_WEBHOOK_SECRET` (protect `/api/webhooks/brevo`)
- `CRON_SECRET` (protect job endpoints for cron calls)
- `BI_API_KEY` (protect `/api/bi/kpis`)
- `NEXT_PUBLIC_APP_NAME`

Password reset delivery notes:
- Supabase Auth email sending has provider limits on free tiers (`email rate limit exceeded` may appear after repeated requests).
- ATA CRM UI now throttles reset retries for 60s and shows a clear message instead of raw provider text.
- For reliable production delivery, configure custom SMTP in Supabase Auth (Email settings).
- Keep callback URL configured in Supabase for:
  - `http://127.0.0.1:3000/auth/callback`
  - your production callback domain path (`/auth/callback`)

## Quality Checks
```bash
npm run lint
npm run build
npm run test
npm --workspace web run test:coverage
```

Full health (lint + build + e2e):
```bash
npm run health
```

## End-to-End Tests (Playwright)
```bash
npm run test:e2e
npm --workspace web run test:e2e:smoke
npm --workspace web run test:e2e:full
```

Notes:
- E2E setup auto-creates/updates role-based test users (`admin`, `manager`, `commercial`, `standard_user`) and runs the demo seed.
- Includes language switch persistence, role-based access scenarios, and mobile smoke coverage.
- Test credentials can be overridden with:
  - `E2E_USER_EMAIL`
  - `E2E_USER_PASSWORD`
  - `E2E_MANAGER_EMAIL`
  - `E2E_MANAGER_PASSWORD`
  - `E2E_COMMERCIAL_EMAIL`
  - `E2E_COMMERCIAL_PASSWORD`
  - `E2E_STANDARD_EMAIL`
  - `E2E_STANDARD_PASSWORD`

## Demo Seed (under 2 minutes)
```bash
npm run seed:demo
```

The seed is idempotent and creates `[DEMO]` data for live presentation.

## Deployment
- Vercel root directory: `web`
- Supabase: linked project
- Recommended Vercel environments:
  - `Production`: real production secrets
  - `Preview`: isolated testing secrets
  - `Development`: local developer secrets

## Docker (Bonus)
Build and run with Docker Compose:

```bash
cd C:\dev\crm-food-trading
docker compose up --build -d
```

App URL:
- `http://localhost:3000`

Stop:

```bash
docker compose down
```

Notes:
- `docker-compose.yml` reads runtime secrets from `web/.env.local`.
- For BI tools, call:
  - `GET /api/bi/kpis?range=30d&api_key=YOUR_BI_API_KEY`

## Branch Policy (active)
- Protected `main`
- Required status check: `lint-build`
- Linear history + conversation resolution enabled
- Admins included in protection
- Auto-delete merged branches enabled

## Documentation
- Default language: English
- Additional delivery language: French
- French report: `docs/rapport-projet-fr.md`
- Persian summary (archived): `docs/resume-projet-fa.md`
- Demo checklist: `docs/checklist-demo.md`
- Oral presentation script (FR): `docs/presentation-oral-fr.md`
- Formal test game (FR): `docs/jeu-de-test-crm-fr.md`
- Professor comparison with evidence (FR): `docs/comparaison-enonce-preuves-fr.md`
- Final compliance matrix: `docs/final-compliance-checklist.md`
- Safe baseline notes: `docs/release-baseline-v1.md`
- Docs index: `docs/README.md`
- Diagrams: `docs/architecture.mmd`, `docs/workflow-commercial.mmd`, `docs/workflow-onboarding-help.mmd`, `docs/sequence-followup.mmd`, `docs/mcd.mmd`, `docs/use-case.puml`, `docs/uml-domain.puml`, `docs/uml-application-view.puml`
