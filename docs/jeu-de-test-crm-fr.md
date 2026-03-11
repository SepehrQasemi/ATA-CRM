# Jeu De Test CRM (Soutenance)

## Objectif
Valider le parcours complet "prospect -> client" avec preuves metier et techniques.

## Pre-conditions
- Application lancee (`http://127.0.0.1:3000/login`).
- Base alimentee via:
```bash
npm run seed:demo
```
- Compte admin fonctionnel.

## Cas 1 - Auth + session
- Action: login.
- Attendu: acces dashboard, role visible dans sidebar.

## Cas 2 - Creation entreprise + contact agent
- Action: creer une entreprise (`both`) puis un contact agent (rank 1).
- Attendu: entreprise visible dans liste, agent visible dans profil entreprise.

## Cas 3 - Creation produit + relation entreprise
- Action: creer produit, lier en `traded` puis `potential` avec model/grade.
- Attendu: relation visible dans profil produit et profil entreprise.

## Cas 4 - Lead et progression pipeline
- Action: creer lead, assigner commercial, deplacer de stage (next/prev), puis passer en `Negotiation`.
- Attendu: en `Negotiation`, la carte affiche deux actions explicites `Mark Won` et `Mark Lost` (et conserve `Prev`, `Edit`, `Create task`).

## Cas 5 - Probabilite et forecast
- Action: verifier la probabilite affichee sur la carte lead selon l etape (5/20/30/50/70/100/0).
- Attendu: dashboard met a jour la valeur pipeline ponderee et le calendrier de prevision mensuelle.

## Cas 6 - Task depuis lead
- Action: creer task via bouton "Create task" depuis carte lead.
- Attendu: task visible dans liste + calendrier.

## Cas 7 - Alertes et notifications
- Action: afficher alertes due soon/overdue + bell notification.
- Attendu: preview au hover, page notifications avec suppression unitaire/totale.

## Cas 8 - Email test + follow-up dry run
- Action: envoyer email test puis lancer follow-up en `dry_run`.
- Attendu: logs email mis a jour, rapport dry-run visible.

## Cas 9 - Dashboard scopes et export
- Action: en manager/admin, basculer `My pipeline` / `Team pipeline`, puis exporter CSV/PDF.
- Attendu: changement de scope pris en compte (KPI + forecast), fichier export telecharge.

## Cas 10 - RBAC
- Action: verifier acces admin/manager/commercial/standard.
- Attendu: restrictions respectees (access page, edition scope, visibilite), notamment:
  - standard/commercial: scope personnel force
  - manager/admin: scope equipe autorise

## Cas 11 - Regression technique
- Action: lancer qualite complete.
- Commandes:
```bash
npm run lint
npm run build
npm run test
npm --workspace web run test:e2e:smoke
```
- Attendu: exit code 0 partout.
