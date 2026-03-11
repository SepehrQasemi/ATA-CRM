# Guide Soutenance Professeur (Exigences + Plan d action)

Date: 2026-03-11  
Projet: ATA CRM

## 1) Exigences explicites relevees dans les fichiers professeur

Sources exploitees:
- `C:\Users\Sepehr\Downloads\Enonce du projet_CRM.docx`
- `C:\Users\Sepehr\Downloads\1- CRM version Etudiant.docx`
- `C:\Users\Sepehr\Downloads\3- pipeline vs funnel.docx`
- `C:\Users\Sepehr\Downloads\4-scenario simple.docx`
- `C:\Users\Sepehr\Downloads\6- Pipeline de vente VS Workflow.docx`
- `C:\Users\Sepehr\Downloads\portfolio.docx`

Exigences coeur du CRM (minimum attendu):
- Authentification: login / logout / inscription / reset password.
- Roles: admin / commercial / utilisateur standard (manager accepte en extension).
- Modules: contacts, entreprises, leads, pipeline/funnel, taches, emails, dashboard KPI.
- Base relationnelle + API + securite.
- UI responsive et ergonomique.
- Deploiement cloud (Vercel) + code source GitHub.
- Documentation technique (README + modelisation UML/MCD + architecture).
- Presentation orale avec demonstration et jeu de test.

Attendus pedagogiques transversaux:
- Stack SaaS moderne (Supabase, Vercel, Brevo) et integration API.
- Workflow Git/GitHub propre.
- Capacite a expliquer la logique metier (pipeline + funnel + workflow).
- Expliquer clairement le flux reset password: email -> callback auth -> formulaire de nouveau mot de passe.

Ponderation relevee:
- Fonctionnalites + soutenance orale: 40%
- Qualite code / bonnes pratiques: 20%
- UI/UX: 15%
- Deploiement + CI/CD: 15%
- Documentation: 10%
- Bonus originalite workflow/pipeline: +5 a +10%

## 2) Etat ATA CRM vs exigences

Statut global: **complet et soutenable**.

Points forts a valoriser:
- Couverture fonctionnelle complete (contacts, entreprises, categories, produits, leads, taches, emails, KPI).
- Pipeline + funnel + automatisation (follow-up 72h, rappels taches).
- Qualite logicielle: lint, build, tests unitaires/composants/API, E2E smoke/full, coverage gate.
- Deploiement cloud + CI GitHub Actions.
- Documentation complete + comparaison enonce + checklist demo.

## 3) Package a montrer au professeur (ordre conseille)

1. Application live (Vercel ou local fallback).
2. Repo GitHub.
3. Docs techniques:
   - `docs/rapport-projet-fr.md`
   - `docs/comparaison-enonce-preuves-fr.md`
   - `docs/final-compliance-checklist.md`
   - `docs/qa-proof-2026-03-11.md`
4. Diagrammes:
   - `docs/mcd.mmd`
   - `docs/use-case.puml`
   - `docs/architecture.mmd`
5. Support oral:
   - `docs/presentation-oral-fr.md`
   - `docs/jeu-de-test-crm-fr.md`
   - `docs/checklist-demo.md`

## 4) Script soutenance 8-10 min (ultra concret)

1. Contexte metier (30-45s): ATA, negoce ingredients, besoin CRM.
2. Auth + roles (45s): login/signup/reset + RBAC.
3. Donnees metier (1m30): entreprise -> contact agent -> categorie produit -> produit -> relation traded/potential.
4. Lead pipeline/funnel (2m): creation lead, movement stage, lecture funnel.
5. Taches + notifications (1m30): task privee/groupe/publique + deadlines + bell.
6. Emails (1m30): test email + follow-up dry-run + logs.
7. Dashboard KPI + forecast + export (1m30): 7/30/90j, forecast pondere, leaderboard, CSV/PDF.
8. Qualite & deploiement (1m): tests, CI, Vercel, Docker bonus.

## 5) Questions probables + reponses courtes

- "Quelle difference funnel/pipeline?"
  - Funnel = vision conversion globale; pipeline = suivi operationnel prospect par prospect.
- "Ou est l automatisation?"
  - Follow-up 72h, reminders taches, logs complets, mode dry-run.
- "Comment vous garantissez la qualite?"
  - CI + tests unit/component/api/e2e + release gate + coverage gate.
- "Pourquoi le reset password est robuste?"
  - Callback auth dedie + formulaire reset + fallback messages clairs + gestion rate-limit.
- "Que reste-t-il a faire en V2?"
  - BI multi-pages, scoring lead avance, notifications push.

## 6) Risques de derniere minute et fallback

- Reset email rate-limit: attendre 60s puis relancer.
- Provider email indisponible: demontrer mode dry-run + logs.
- Probleme de deploiement: basculer sur local `npm run dev` avec seed demo.
- Donnees incoherentes: `npm run seed:demo`.
