# Checklist Demo (Avant / Pendant / Fallback)

## Avant la soutenance (T-30 min)
- Verifier `npm run lint` et `npm run build`
- Verifier que le projet Supabase est accessible
- Lancer `npm run seed:demo` pour charger les donnees de demo
- Verifier que les templates email sont actifs
- Ouvrir les onglets:
  - Login
  - Dashboard
  - Leads
  - Tasks
  - Emails
- Preparer les liens:
  - Repo GitHub
  - Demo Vercel
  - Rapport FR

## Pendant la soutenance (8-10 min)
1. Login et contexte metier
2. Creation company + contact
3. Creation lead et assignment
4. Changement de stage (select + quick move)
5. Creation task et mise a jour du status
6. Email test (template + contact)
7. Follow-up dry-run puis run reel
8. Dashboard: KPI + funnel + leaderboard + stage aging
9. Conclusion: limites et next iteration

## Fallback technique
- Si Brevo indisponible:
  - Montrer `dry_run` du job follow-up
  - Montrer les logs `failed` et la gestion d erreur
- Si Vercel indisponible:
  - Lancer en local (`npm run dev`)
  - Montrer la meme demo sur `localhost`
- Si donnees incoherentes:
  - Relancer `npm run seed:demo`
- Si compte bloque:
  - Utiliser un compte admin de secours

## Points d evaluation a verbaliser
- Couverture fonctionnelle des exigences
- Securite (roles + RLS)
- Fiabilite automation (idempotence)
- Qualite livrable (CI, seed demo, docs)
- Vision d amelioration (next iteration)
