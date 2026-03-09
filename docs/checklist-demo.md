# Demo Checklist (Before / During / Fallback)

## Before Presentation (T-30 min)
- Verify `npm run lint` and `npm run build`
- Verify Supabase project access
- Run `npm run seed:demo` to load demo data
- Verify email templates are active
- Open tabs:
  - Login
  - Dashboard
  - Leads
  - Tasks
  - Products
  - Companies
  - Emails
- Prepare links:
  - GitHub repo
  - Vercel demo
  - Main report

## During Presentation (8-10 min)
1. Login and business context
2. Create company + contact
3. Set company role (supplier/customer/both), then link products as traded/potential
4. Create lead and assign owner
5. Move lead stage (select + quick move)
6. Create task, show monthly calendar, and update status
7. Send test email (template + contact)
8. Run follow-up in dry-run, then real run
9. Run task reminders in dry-run
10. Show dashboard: KPI + funnel + leaderboard + stage aging + email rates
11. Conclusion: limitations and next iteration

## Technical Fallback
- If Brevo is unavailable:
  - Show follow-up `dry_run`
  - Show task reminders `dry_run`
  - Show `failed` logs and error handling
- If Vercel is unavailable:
  - Run locally (`npm run dev`)
  - Present the same flow on `localhost`
- If data is inconsistent:
  - Rerun `npm run seed:demo`
- If account is blocked:
  - Use a backup admin account

## Evaluation Points To Mention
- Functional coverage of requirements
- Security (roles + RLS)
- Automation reliability (idempotency)
- End-to-end quality (Playwright scenario)
- Delivery quality (CI, demo seed, docs)
- Improvement roadmap (next iteration)
