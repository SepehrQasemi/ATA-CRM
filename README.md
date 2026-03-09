# CRM Food Trading

SaaS CRM project for a B2B company trading raw food ingredients.

## Structure
- `supabase/`: SQL migrations and schema assets
- `web/`: Next.js application (frontend + API routes)
- `docs/`: reports, diagrams, and demo checklist
- `.github/workflows/ci.yml`: lint + build pipeline

## Main Features
- Authentication (login, signup, reset) + roles (`admin`, `commercial`, `standard_user`)
- Full CRUD with edit support for `contacts`, `companies`, `leads`, `tasks`
- Full CRUD for `products` with supplier/customer relationships
- Sales pipeline with stage change, quick move, and history
- Multi-criteria filters on leads/tasks/contacts/companies
- KPI dashboard (7/30/90 days) + funnel + leaderboard + stage aging
- Manual email + test email + logs + 72h follow-up
- Idempotent follow-up job with DB lock + `dry_run` mode

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
- `POST /api/emails/send`
- `GET /api/emails/logs`
- `POST /api/jobs/followup?dry_run=true`

## Useful Query Params
- `GET /api/leads`: `stage_id`, `status`, `assigned_to`, `source`, `q`, `from`, `to`
- `GET /api/tasks`: `status`, `priority`, `overdue`, `from`, `to`, `q`
- `GET /api/contacts`: `q`, `company_id`
- `GET /api/companies`: `q`, `sector`
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

## Quality Checks
```bash
npm run lint
npm run build
```

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

## Branch Policy (target)
- Protected `main`
- Merge via PR only
- CI checks (`lint + build`) required before merge

## Documentation
- Default language: English
- Additional versions: French and Persian
- French report: `docs/rapport-projet-fr.md`
- Persian summary: `docs/resume-projet-fa.md`
- Demo checklist: `docs/checklist-demo.md`
- Diagrams: `docs/architecture.mmd`, `docs/mcd.mmd`, `docs/use-case.puml`
