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
- Suivi email (manuel pour tous, test/admin, relance 72h/admin, rappels de taches/admin)
- Dashboard KPI pour la prise de decision
- Securite par roles, controle d edition et visibilite interne partagee

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
- Realtime layer: Supabase Realtime (notifications live)
- Hebergement: Vercel
- Versioning et CI: GitHub + GitHub Actions
- Container runtime bonus: Docker

Le schema d architecture est fourni dans `docs/architecture.mmd`.
Le workflow commercial detaille est fourni dans `docs/workflow-commercial.mmd`.
Le sequence diagram de relance 72h est fourni dans `docs/sequence-followup.mmd`.
Le diagramme UML de domaine detaille est fourni dans `docs/uml-domain.puml`.

## 6. Modules implementes
### 6.1 Authentification et roles
- Login / signup / reset password
- Signup avec confirmation de mot de passe
- Champs mot de passe avec bouton afficher/masquer (icone oeil) sur login/reset/settings
- Roles: `admin`, `manager`, `commercial`, `standard_user`
- Premier compte inscrit auto-promu `admin`
- Page `Settings` restauree avec scope minimal: reset password

### 6.2 CRUD metier complet
- `contacts`: create/read/update/delete + filtres q/company
- `companies`: create/read/update/delete + filtres q/sector/company_role
- `product_categories`: create/read/update/delete + profil categorie
- `products`: create/read/update/delete + liens traded/potential avec les entreprises
- `leads`: create/read/update/delete + pipeline stage move + quick move
- `tasks`: create/read/update/delete + statuts/priorites/echeances

Detail categories/produits:
- creation d une categorie puis selection obligatoire dans la fiche produit
- profil categorie avec description, liste produits, liste fournisseurs et clients (pagination 10 par carte)
- profil produit avec description + listes fournisseurs/clients (pagination 10 par carte)

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
- envoi manuel avec champs obligatoires (destinataire, objet, contenu)
- suggestions intelligentes de destinataire (contacts, collegues, domaines d entreprises)
- envoi test (template + contact) reserve admin
- job follow-up 72h reserve admin
- job task reminders reserve admin
- mode `dry_run` pour demo
- journal detaille (status, error, provider_message_id)
- analytics email via webhook Brevo (`open_count`, `click_count`, timestamps)
- scope analytics: admin = global, non-admin = uniquement ses propres envois

### 6.7 Bonus engineering
- export dashboard en CSV/PDF
- endpoint BI securise (`/api/bi/kpis`) pour Power BI/Metabase
- notifications live (leads, tasks, emails) avec fallback polling
- containerisation Docker (`Dockerfile`, `docker-compose.yml`)

### 6.8 Evolution UI/UX (impact rapide)
- entree directe vers login (`/` redirige vers `/login`) pour un acces operationnel rapide
- logo ATA CRM (SVG) applique sur login/sidebar
- design tokens harmonises (couleurs, rayons, ombres, typographie)
- switch langue global `EN/FR` avec persistance locale + cookie
- version persane archivee pour cette soutenance (pas de mode RTL actif)
- Help Center interne (`/help`) avec onboarding, FAQ et guide des roles
- in-app tips dismissibles (persistes en localStorage)
- global quick search (leads/companies/contacts)
- saved filters sur leads et tasks

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
- `/api/exports/report?format=csv|pdf&range=7d|30d|90d`
- `/api/bi/kpis?range=7d|30d|90d` (x-api-key requis)
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
- Mode "petite equipe": lecture partagee des donnees metier pour les utilisateurs internes
- Controle strict d edition/suppression par role (admin/manager vs utilisateurs standards)
- Cle service role uniquement cote serveur
- Jobs proteges admin-only (ou secret cron)
- Webhook Brevo protege par token secret optionnel

## 9. Qualite, tests et CI/CD
Validation technique:
- `npm run lint` : OK
- `npm run build` : OK
- `npm run test` : OK (unit + component + api)
- `npm run test:e2e` : OK (suite complete Playwright)
- `npm --workspace web run test:e2e:smoke` : OK
- `npm run test:release` : OK
- `npm --workspace web run test:coverage` : OK
- couverture globale:
  - statements: 98.94%
  - branches: 73.51%
  - functions: 89.47%
  - lines: 98.94%
- migrations Supabase appliquees (dont categories produits):
  - `20260309224000_email_analytics_and_task_reminders.sql`
  - `20260311112000_product_categories.sql`
- export CSV/PDF valide en local et production
- endpoint BI valide avec cle API

CI:
- GitHub Actions `lint + build` sur push/PR

Demo reproductible:
- script `npm run seed:demo` (idempotent, < 2 minutes)
- baseline securisee avant evolution: `docs/release-baseline-v1.md`
- workflow onboarding/help: `docs/workflow-onboarding-help.mmd`
- UML applicatif (i18n/help/search): `docs/uml-application-view.puml`

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
- pas encore de dashboard BI multi-pages preconfigure (uniquement endpoint API)
- pas encore de gestion avancee des permissions BI par scope
- pas encore de module forecasting previsionnel commercial

Next iteration:
- connecteur Power BI template + data model documente
- notifications push navigateur avec preferances utilisateur
- segmentation avancee et scoring lead
- hardening Docker multi-stage + image slim

## 12. Conclusion
Le projet couvre les criteres fonctionnels majeurs d un CRM pedagogique MIAGE:
collecte, qualification, conversion, suivi, automatisation, analytics email et pilotage KPI.
La solution est deployable, demonstrable en soutenance et maintenable avec CI.
