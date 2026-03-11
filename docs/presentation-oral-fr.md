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
- Pipeline: deplacement d etape (select + prev/next).
- Carte lead simplifiee: titre, entreprise, agent, commercial assigne.
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
- Filtres temporels: 7d / 30d / 90d.
- Export CSV / PDF.

## 8. Qualite / DevOps / conclusion (1m)
- CI: lint + build + tests + e2e smoke/full.
- Coverage gate: statements 98.94%, branches 73.51%, functions 89.47%, lines 98.94%.
- Deploiement Vercel connecte GitHub.
- Docker en bonus pour portabilite locale.
- Conclusion: projet full SaaS operationnel, demonstrable et evolutif.
