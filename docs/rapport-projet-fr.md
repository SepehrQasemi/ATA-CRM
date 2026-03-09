# Rapport Projet CRM (FR)

## 1. Contexte et besoin
Le projet cible une societe de negoce en matieres premieres alimentaires.
Le besoin metier est de centraliser la relation client, standardiser le cycle de vente et piloter les performances commerciales avec des KPI fiables.

## 2. Exigences fonctionnelles
- Gestion des contacts et entreprises
- Gestion des produits et de leur relation business (deja negocies / potentiels)
- Gestion des leads avec pipeline commercial
- Gestion des taches commerciales
- Planification sur calendrier mensuel + alertes d echeance
- Suivi email (manuel, test, relance 72h, rappels de taches)
- Dashboard KPI pour la prise de decision
- Securite par roles et isolation des donnees

## 3. Use cases principaux
- Un commercial cree un lead, l assigne, puis le fait progresser dans le pipeline
- Un manager suit la conversion, la valeur pipeline et les retards de taches
- Le systeme lance une relance automatique sur les leads bloques a 72h
- Le systeme envoie des rappels sur les taches en retard ou proches de l echeance
- L equipe envoie un email test avant campagne reale

Le diagramme UML use case est fourni dans `docs/use-case.puml`.

## 4. Modele de donnees (MCD/Merise)
Entites principales:
- `profiles`
- `companies`
- `contacts`
- `products`
- `product_company_links`
- `pipeline_stages`
- `leads`
- `lead_stage_history`
- `tasks`
- `email_templates`
- `email_logs` (avec analytics open/click)
- `automation_execution_locks` (idempotence jobs)

Le schema MCD est fourni dans `docs/mcd.mmd`.

## 5. Architecture technique
- Frontend et API: Next.js 16
- Data + auth + RLS: Supabase PostgreSQL
- Email provider: Brevo API + webhook events
- Hebergement: Vercel
- Versioning et CI: GitHub + GitHub Actions

Le schema d architecture est fourni dans `docs/architecture.mmd`.

## 6. Modules implementes
### 6.1 Authentification et roles
- Login / signup / reset password
- Roles: `admin`, `commercial`, `standard_user`
- Premier compte inscrit auto-promu `admin`

### 6.2 CRUD metier complet
- `contacts`: create/read/update/delete + filtres q/company
- `companies`: create/read/update/delete + filtres q/sector/company_role
- `products`: create/read/update/delete + liens traded/potential avec les entreprises
- `leads`: create/read/update/delete + pipeline stage move + quick move
- `tasks`: create/read/update/delete + statuts/priorites/echeances

### 6.3 Pipeline et funnel
Pipeline metier:
1. Nouveau lead
2. Qualification
3. Echantillon envoye
4. Devis envoye
5. Negociation
6. Gagne
7. Perdu

Fonctions:
- compteur par etape
- valeur totale par etape
- historique de changement de stage
- funnel avec chaines de conversion et taux inter-etapes

### 6.4 Planning et notifications de taches
- vue calendrier mensuelle
- tri visuel par jour/echeance
- liste des alertes "overdue" et "due soon"
- job de rappels taches avec `dry_run` et execution reelle
- verrou idempotent DB pour bloquer les doubles envois

### 6.5 Dashboard KPI
KPI principaux:
- total leads
- won / lost
- conversion rate
- pipeline value
- overdue tasks
- due soon tasks (24h)
- sent emails
- email open rate / click rate

KPI complementaires:
- leads by source
- sales by commercial (sur leads won)
- stage aging (moyenne jours dans etape)
- range selector: `7d`, `30d`, `90d`

### 6.6 Email automation robuste
- envoi manuel avec templates
- envoi test (template + contact)
- job follow-up 72h
- job task reminders
- mode `dry_run` pour demo
- journal detaille (status, error, provider_message_id)
- analytics email via webhook Brevo (`open_count`, `click_count`, timestamps)

## 7. API REST
Routes principales:
- `/api/contacts`
- `/api/contacts/:id`
- `/api/companies`
- `/api/companies/:id`
- `/api/products`
- `/api/products/:id`
- `/api/products/:id/links`
- `/api/products/:id/links/:linkId`
- `/api/leads`
- `/api/leads/:id`
- `/api/leads/:id/stage`
- `/api/tasks`
- `/api/tasks/:id`
- `/api/dashboard?range=7d|30d|90d`
- `/api/emails/send`
- `/api/emails/logs`
- `/api/jobs/followup?dry_run=true`
- `/api/jobs/task-reminders?dry_run=true`
- `/api/webhooks/brevo`

Filtres exposes:
- leads: `stage_id`, `status`, `assigned_to`, `source`, `q`, `from`, `to`
- tasks: `status`, `priority`, `overdue`, `from`, `to`, `q`
- contacts: `q`, `company_id`
- companies: `q`, `sector`, `company_role`
- products: `q`, `category`, `is_active`, `relation_type`

## 8. Securite
- Auth Supabase (JWT session)
- RLS active sur les tables metier
- Filtrage owner/assigned pour utilisateurs non-admin
- Cle service role uniquement cote serveur
- Jobs proteges par role (admin/commercial) ou secret cron
- Webhook Brevo protege par token secret optionnel

## 9. Qualite, tests et CI/CD
Validation technique:
- `npm run lint` : OK
- `npm run build` : OK
- `npm run test:e2e` : OK (2 scenarios Playwright)
- migration Supabase appliquee (`20260309224000_email_analytics_and_task_reminders.sql`)

CI:
- GitHub Actions `lint + build` sur push/PR

Demo reproductible:
- script `npm run seed:demo` (idempotent, < 2 minutes)

## 10. Plan de soutenance (8-10 min)
Scenario recommande:
1. login
2. creation company + contact + produit lie
3. creation lead
4. progression pipeline (quick move + stage select)
5. creation task + vue calendrier + update statut
6. envoi email test
7. run follow-up dry-run puis execution reelle
8. run task reminders dry-run
9. lecture dashboard (KPI + funnel + leaderboard + rates email)

Checklist complete dans `docs/checklist-demo.md`.

## 11. Limitations & Next iteration
Limitations actuelles:
- pas encore d export PDF/CSV natif
- pas de notifications in-app en temps reel (hors jobs email)
- pas de connecteur BI externe (Power BI / Metabase) pret a l emploi

Next iteration:
- module reporting exportable
- notification center in-app + realtime events
- segmentation avancee et scoring lead
- containerisation Docker (bonus apres exigences principales)

## 12. Conclusion
Le projet couvre les criteres fonctionnels majeurs d un CRM pedagogique MIAGE:
collecte, qualification, conversion, suivi, automatisation, analytics email et pilotage KPI.
La solution est deployable, demonstrable en soutenance et maintenable avec CI.
