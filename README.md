# CRM Food Trading

Projet CRM SaaS pour une entreprise de negoce en matieres premieres alimentaires.

## Structure
- `supabase/`: migrations SQL et schema
- `web/`: application Next.js (frontend + API routes)
- `docs/`: rapport, diagrammes et checklist demo
- `.github/workflows/ci.yml`: pipeline lint + build

## Fonctionnalites principales
- Authentification (login, signup, reset) + roles (`admin`, `commercial`, `standard_user`)
- CRUD complet avec edition pour `contacts`, `companies`, `leads`, `tasks`
- Pipeline de vente avec changement de stage, quick move et historique
- Filtres multi-criteres sur leads/tasks/contacts/companies
- Dashboard KPI 7/30/90 jours + funnel + leaderboard + stage aging
- Email manuel + email test + logs + follow-up 72h
- Job follow-up idempotent avec verrou DB + mode `dry_run`

## APIs principales
- `GET/POST /api/contacts`
- `PATCH/DELETE /api/contacts/:id`
- `GET/POST /api/companies`
- `PATCH/DELETE /api/companies/:id`
- `GET/POST /api/leads`
- `PATCH/DELETE /api/leads/:id`
- `POST /api/leads/:id/stage`
- `GET/POST /api/tasks`
- `PATCH/DELETE /api/tasks/:id`
- `GET /api/dashboard?range=7d|30d|90d`
- `POST /api/emails/send`
- `GET /api/emails/logs`
- `POST /api/jobs/followup?dry_run=true`

## Query params utiles
- `GET /api/leads`: `stage_id`, `status`, `assigned_to`, `source`, `q`, `from`, `to`
- `GET /api/tasks`: `status`, `priority`, `overdue`, `from`, `to`, `q`
- `GET /api/contacts`: `q`, `company_id`
- `GET /api/companies`: `q`, `sector`

## Setup local
1. Copier les secrets dans `web/.env.local`
   - source conseillee: `C:\dev\crm-secrets.env`
2. Installer deps:
```bash
cd C:\dev\crm-food-trading
npm ci
```
3. Appliquer les migrations Supabase (projet deja link):
```bash
npx -y supabase@latest db push
```
4. Lancer l'app:
```bash
npm run dev
```

## Qualite
```bash
npm run lint
npm run build
```

## Seed demo (moins de 2 minutes)
```bash
npm run seed:demo
```

Le seed est idempotent et cree des donnees ` [DEMO] ` pour la soutenance.

## Deploiement
- Vercel: root directory = `web`
- Supabase: projet linke
- Environnements Vercel recommandes:
  - `Production`: variables de production reelles
  - `Preview`: variables de test isolatees
  - `Development`: variables locales de dev

## Politique de branche (cible)
- `main` protegee
- merge uniquement via PR
- checks CI (`lint + build`) obligatoires avant merge

## Livrables docs
- Rapport FR: `docs/rapport-projet-fr.md`
- Resume FA: `docs/resume-projet-fa.md`
- Checklist demo: `docs/checklist-demo.md`
- Diagrammes: `docs/architecture.mmd`, `docs/mcd.mmd`, `docs/use-case.puml`