# CRM Food Trading

SaaS CRM project for a B2B company trading raw food ingredients.

## Structure
- `supabase/`: SQL migrations and schema assets
- `web/`: Next.js application (frontend + API routes)
- `docs/`: reports, diagrams, and demo checklist
- `.github/workflows/ci.yml`: lint + build pipeline

## Main Features
- Public landing page (`/`) with branding, feature overview, and CTA
- Authentication (login, signup, reset) + roles (`admin`, `commercial`, `standard_user`)
- Full i18n UI with language switch (`en`, `fr`, `fa`) and full RTL for Persian
- Help Center (`/help`) with onboarding steps, role guide, and FAQ
- In-app tips (dismissible, persisted in local storage)
- Global search in shell (leads/companies/contacts)
- Full CRUD with edit support for `contacts`, `companies`, `leads`, `tasks`
- Full CRUD for `products` with traded/potential relationship buckets
- Company-product links with specific model/grade tracking (per traded/potential relation)
- Company role model (`supplier`, `customer`, `both`)
- Sales pipeline with stage change, quick move, and history
- Multi-criteria filters on leads/tasks/contacts/companies
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

## Quality Checks
```bash
npm run lint
npm run build
```

Full health (lint + build + e2e):
```bash
npm run health
```

## End-to-End Tests (Playwright)
```bash
npm run test:e2e
```

Notes:
- E2E setup auto-creates/updates an admin test user and runs the demo seed.
- Includes language switch persistence + help center + saved filters scenarios.
- Test credentials can be overridden with:
  - `E2E_USER_EMAIL`
  - `E2E_USER_PASSWORD`

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
- Additional versions: French and Persian
- French report: `docs/rapport-projet-fr.md`
- Persian summary: `docs/resume-projet-fa.md`
- Demo checklist: `docs/checklist-demo.md`
- Final compliance matrix: `docs/final-compliance-checklist.md`
- Safe baseline notes: `docs/release-baseline-v1.md`
- Docs index: `docs/README.md`
- Diagrams: `docs/architecture.mmd`, `docs/workflow-commercial.mmd`, `docs/workflow-onboarding-help.mmd`, `docs/sequence-followup.mmd`, `docs/mcd.mmd`, `docs/use-case.puml`, `docs/uml-domain.puml`, `docs/uml-application-view.puml`
