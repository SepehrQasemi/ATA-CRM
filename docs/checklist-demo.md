# Demo Checklist (Before / During / Fallback)

## Before Presentation (T-30 min)
- Verify `npm run lint` and `npm run build`
- Verify Supabase project access
- Run `npm run seed:presentation` to load clean jury data
- Verify password reset flow once (send link + open email link + callback to `/reset-password` + set new password)
- Verify email templates are active
- Verify dashboard export buttons (CSV/PDF)
- Verify BI endpoint key is set (`BI_API_KEY`)
- Open tabs:
  - Login
  - Dashboard
  - Categories
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
2. (Optional 30s) show reset password robustness from login/settings
3. Create company + contact
4. Create/select product category, then create product
5. Set company role (supplier/customer/both), then link products as traded/potential
6. Create lead and assign owner
7. Move lead stage (select + quick move)
8. On a negotiation lead, show `Mark Won` / `Mark Lost` actions
9. Create task, show monthly calendar, and update status
10. (Admin account) Send test email (template + contact)
11. (Admin account) Run follow-up in dry-run, then real run
12. (Admin account) Run task reminders in dry-run
13. Show dashboard: KPI + weighted forecast calendar + funnel + leaderboard + stage aging + email rates
14. If logged as manager/admin, switch dashboard scope between `My pipeline` and `Team pipeline`
15. Export dashboard report (CSV/PDF) in front of jury
16. Conclusion: limitations and next iteration

## Technical Fallback
- If Brevo is unavailable:
  - Show follow-up `dry_run`
  - Show task reminders `dry_run`
  - Show `failed` logs and error handling
- If Vercel is unavailable:
  - Run locally (`npm run dev`)
  - Present the same flow on `localhost`
- If data is inconsistent:
  - Rerun `npm run seed:presentation`
- If account is blocked:
  - Use a backup admin account

## Evaluation Points To Mention
- Functional coverage of requirements
- Security (roles + RLS)
- Automation reliability (idempotency)
- End-to-end quality (Playwright scenario)
- Delivery quality (CI, demo seed, docs)
- Bonus engineering (CSV/PDF export + BI endpoint + Docker)
- Improvement roadmap (next iteration)
