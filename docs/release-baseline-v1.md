# Safe Baseline Freeze (v1)

Date: 2026-03-10
Scope: CRM + documentation package before feature upgrades.

## Objective
Create a stable checkpoint that is easy to:
- demonstrate,
- redeploy,
- and roll back to if an upgrade introduces regressions.

## Freeze Content
- Functional app state from `main`
- Verified CI pipeline (`lint-build`)
- Verified E2E smoke (`npm run test:e2e`)
- Verified docs package (reports + diagrams + checklist)
- Protected branch policy on GitHub

## Validation Steps
Run from repository root:

```bash
npm run lint
npm run build
npm run test:e2e
```

Expected: all commands pass with exit code 0.

## Deploy Validation
- Production URL responds on `/login`
- Dashboard loads with seeded demo data
- API `/api/dashboard?range=30d` returns expected KPIs

## Rollback Procedure
If a future release fails:

1. Checkout the baseline tag:
```bash
git checkout v1.0.0-baseline
```
2. Redeploy from this reference (Vercel or Docker compose).
3. Re-apply known-good environment variables.
4. Run smoke checks (`/login`, dashboard, leads pipeline, email logs).

## Upgrade Guardrails
- New work starts from dedicated feature branches.
- No direct push to `main`.
- Merge only after CI green + review of docs/test impact.
