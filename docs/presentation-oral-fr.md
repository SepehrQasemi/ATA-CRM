# Presentation Orale (8-10 min) - ATA CRM

## 1. Introduction (45s)
- Contexte: entreprise B2B de negoce en ingredients alimentaires.
- Objectif: centraliser clients/prospects, accelerer le suivi commercial, automatiser la communication.
- Stack: Next.js + Supabase + Brevo + Vercel + GitHub Actions.

## 2. Authentification et roles (45s)
- Login / signup / reset password.
- Signup avec confirmation mot de passe + bouton afficher/masquer.
- Reset flow: email -> `/auth/callback?next=/reset-password` -> formulaire de nouveau mot de passe.
- Page Settings minimale (reset password) pour gestion autonome du compte.
- Roles: `admin`, `manager`, `commercial`, `standard_user`.
- Controle d acces par role + RLS cote base.

## 3. Donnees metier (1m30)
- Contacts: fiche detaillee, profil, edition in-page.
- Companies: role (`supplier` / `customer` / `both`) + agents + produits lies.
- Categories: gestion dediee + profil categorie (description, produits, clients, fournisseurs).
- Products: catalogue + profil + relations entreprise/produit (traded/potential, model/grade).

## 4. Leads + Pipeline + Funnel (2m)
- Creation de lead et affectation.
- Saisie de lead guidee: source fixe + autocompletion contact/entreprise (prefix suggestions).
- Règle d'affectation: le créateur reste assigné par défaut, réaffectation réservée à l'admin.
- Pipeline: deplacement d etape (select + prev/next).
- Regle Negotiation: deux sorties explicites `Won` / `Lost` (plus de `next` ambigu).
- Colonnes `Won` / `Lost` paginées (5 cartes par page) pour garder le board lisible.
- Carte lead simplifiee: titre, entreprise cible, agent, commercial assigne, actions (prev / edit / create task / issue).
- Probabilite de succes par etape: New 5% -> Qualification 20% -> Sample 30% -> Quote 50% -> Negotiation 70% -> Won 100% / Lost 0%.
- Funnel: chaines de conversion et taux par transition.

## 5. Taches + calendrier + notifications (1m30)
- Taches privees / groupe / publiques.
- Vue calendrier mensuelle.
- Alertes deadlines: overdue / due soon.
- Notification bell en haut + page notifications (delete one / clear all).

## 6. Emails et automatisation (1m30)
- Envoi manuel + test email.
- Follow-up 72h avec verrou idempotent.
- `dry_run` pour demo sans risque.
- Logs email: statut, erreurs, open/click rates.

## 7. Dashboard KPI (1m30)
- KPI: total leads, won/lost, conversion rate, pipeline value, overdue tasks, sent emails.
- KPI avances: leads by source, leaderboard, stage aging.
- Forecast pondere: `valeur_lead * probabilite(etape)` avec projection mensuelle.
- Scope d affichage:
  - commercial / standard_user: "My pipeline" uniquement
  - manager / admin: "My pipeline" + "Team pipeline"
- Filtres temporels: 7d / 30d / 90d.
- Export CSV / PDF.

## 8. Qualite / DevOps / conclusion (1m)
- CI: lint + build + tests + e2e smoke/full.
- Coverage gate: statements 98.96%, branches 74.55%, functions 89.47%, lines 98.96%.
- Deploiement Vercel connecte GitHub.
- Docker en bonus pour portabilite locale.
- Conclusion: projet full SaaS operationnel, demonstrable et evolutif.
