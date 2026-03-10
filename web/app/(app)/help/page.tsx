"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type FaqItem = { q: string; a: string };
type MetaResponse = {
  profiles: Array<{ id: string; full_name: string | null; role: string }>;
  stages: Array<{ id: string; name: string; sort_order: number; is_closed: boolean }>;
  templates: Array<{ id: string; name: string; event_type: string; subject: string; is_active: boolean }>;
};

function contentByLocale(locale: "en" | "fr" | "fa") {
  if (locale === "fr") {
    return {
      title: "Centre d'aide",
      subtitle: "Onboarding rapide, FAQ et guide par rôle.",
      onboardingTitle: "Onboarding rapide",
      steps: [
        "Créer une entreprise et un contact.",
        "Créer un produit et lier traded/potential.",
        "Créer un lead puis déplacer ses étapes.",
        "Créer une tâche et vérifier le calendrier.",
        "Envoyer un email test et vérifier les logs.",
        "Lire les KPI du dashboard et exporter CSV/PDF.",
      ],
      roleTitle: "Guide des rôles",
      roles: [
        "admin: accès complet, configuration et supervision.",
        "commercial: gestion opérationnelle des leads, tâches et emails.",
        "standard_user: accès standard aux données autorisées.",
      ],
      faqTitle: "Questions fréquentes",
      directionTitle: "Langue & direction",
      directionBody:
        "Utilisez le sélecteur EN/FR/FA. Le mode FA active automatiquement le RTL.",
    };
  }

  if (locale === "fa") {
    return {
      title: "مرکز راهنما",
      subtitle: "شروع سریع، سوالات متداول و راهنمای نقش‌ها.",
      onboardingTitle: "شروع سریع",
      steps: [
        "یک شرکت و یک مخاطب ایجاد کنید.",
        "یک محصول بسازید و traded/potential را لینک کنید.",
        "یک سرنخ ایجاد کرده و مرحله آن را تغییر دهید.",
        "یک تسک بسازید و در تقویم بررسی کنید.",
        "ایمیل تست بفرستید و لاگ‌ها را ببینید.",
        "KPIهای داشبورد را مرور و CSV/PDF خروجی بگیرید.",
      ],
      roleTitle: "راهنمای نقش‌ها",
      roles: [
        "admin: دسترسی کامل، تنظیمات و نظارت.",
        "commercial: مدیریت عملیاتی سرنخ‌ها، تسک‌ها و ایمیل‌ها.",
        "standard_user: دسترسی استاندارد به داده‌های مجاز.",
      ],
      faqTitle: "سوالات متداول",
      directionTitle: "زبان و جهت نمایش",
      directionBody:
        "از سوییچر EN/FR/FA استفاده کنید. در فارسی، چینش به صورت RTL فعال می‌شود.",
    };
  }

  return {
    title: "Help Center",
    subtitle: "Quick onboarding, FAQ, and role-based guidance.",
    onboardingTitle: "Quick onboarding",
    steps: [
      "Create one company and one contact.",
      "Create one product and link traded/potential relations.",
      "Create one lead then move stages in pipeline.",
      "Create one task and verify calendar visibility.",
      "Send one test email and review logs.",
      "Read dashboard KPI and export CSV/PDF reports.",
    ],
    roleTitle: "Role guide",
    roles: [
      "admin: full access, setup, and monitoring.",
      "commercial: daily operations for leads, tasks, and emails.",
      "standard_user: standard access to allowed data.",
    ],
    faqTitle: "Frequently Asked Questions",
    directionTitle: "Language & direction",
    directionBody:
      "Use the EN/FR/FA switcher. Persian automatically enables full RTL layout.",
  };
}

function faqsByLocale(locale: "en" | "fr" | "fa"): FaqItem[] {
  if (locale === "fr") {
    return [
      { q: "Comment créer un lead rapidement ?", a: "Allez dans Leads, remplissez le formulaire et cliquez sur créer." },
      { q: "Comment changer une étape du pipeline ?", a: "Utilisez Select stage ou les boutons Prev/Next sur la carte lead." },
      { q: "Comment enregistrer mes filtres ?", a: "Dans Leads et Tasks, utilisez le bouton Save filters." },
      { q: "Comment envoyer un email test ?", a: "Dans Emails, section Send test email, choisissez template + contact." },
      { q: "Comment lancer la relance 72h ?", a: "Emails -> Run follow-up 72h, d'abord dry-run puis exécution réelle." },
      { q: "Comment voir les tâches urgentes ?", a: "Tasks affiche Overdue, Due in 24h et un tableau d'alertes." },
      { q: "Comment exporter les KPI ?", a: "Dashboard propose Export CSV et Export PDF." },
      { q: "Comment passer en persan RTL ?", a: "Choisissez FA dans le sélecteur de langue." },
      { q: "Où sont les logs d'emails ?", a: "Emails -> Email logs." },
      { q: "Qui peut gérer les réglages ?", a: "Les admins gèrent setup et supervision." },
      { q: "Comment relier un produit à une entreprise ?", a: "Products -> Product-company relations (traded/potential)." },
      { q: "Comment relancer une démo propre ?", a: "Exécutez seed demo puis suivez checklist demo." },
    ];
  }
  if (locale === "fa") {
    return [
      { q: "چطور سریع سرنخ بسازم؟", a: "به صفحه Leads برو، فرم را پر کن و Create lead را بزن." },
      { q: "چطور مرحله پایپ‌لاین را تغییر بدهم؟", a: "از Select stage یا دکمه‌های Prev/Next روی کارت سرنخ استفاده کن." },
      { q: "چطور فیلترها را ذخیره کنم؟", a: "در Leads و Tasks دکمه Save filters را بزن." },
      { q: "چطور ایمیل تست بفرستم؟", a: "در صفحه Emails بخش Send test email قالب و مخاطب را انتخاب کن." },
      { q: "چطور follow-up 72h اجرا می‌شود؟", a: "در Emails اول dry-run و بعد Run real send را اجرا کن." },
      { q: "تسک‌های فوری کجا دیده می‌شوند؟", a: "در Tasks بخش Overdue و Due in 24h و جدول هشدارها نمایش داده می‌شود." },
      { q: "خروجی KPI را چطور بگیرم؟", a: "در Dashboard روی Export CSV یا Export PDF بزن." },
      { q: "RTL فارسی چطور فعال می‌شود؟", a: "از سوییچر زبان، FA را انتخاب کن." },
      { q: "لاگ ایمیل‌ها کجاست؟", a: "در Emails بخش Email logs." },
      { q: "چه کسی تنظیمات را مدیریت می‌کند؟", a: "ادمین دسترسی کامل برای تنظیمات و نظارت دارد." },
      { q: "اتصال محصول به شرکت چطور است؟", a: "در Products بخش Product-company relations را استفاده کن." },
      { q: "برای دمو تمیز چه کنم؟", a: "seed demo را اجرا کن و طبق checklist جلو برو." },
    ];
  }
  return [
    { q: "How can I create a lead quickly?", a: "Open Leads, fill the form, then click create lead." },
    { q: "How do I move pipeline stages?", a: "Use Select stage or Prev/Next quick actions on lead cards." },
    { q: "How do saved filters work?", a: "Use Save filters in Leads and Tasks to persist your current filters." },
    { q: "How do I send a test email?", a: "Go to Emails, choose template + contact in Send test email." },
    { q: "How do I run 72h follow-up?", a: "Emails -> Run follow-up 72h, use dry-run first then real send." },
    { q: "Where can I see urgent tasks?", a: "Tasks page shows Overdue, Due in 24h, and deadline notifications." },
    { q: "How do I export KPI reports?", a: "Dashboard offers Export CSV and Export PDF actions." },
    { q: "How do I switch to Persian RTL?", a: "Choose FA from the language switcher in the shell." },
    { q: "Where are email logs?", a: "Emails page -> Email logs section." },
    { q: "Who can manage setup and roles?", a: "Admins handle setup and supervision." },
    { q: "How do I link products to companies?", a: "Products page -> Product-company relations form." },
    { q: "How do I reset demo data quickly?", a: "Run the demo seed script and follow demo checklist." },
  ];
}

export default function HelpPage() {
  const { locale } = useLocale();
  const content = useMemo(() => contentByLocale(locale), [locale]);
  const faqs = useMemo(() => faqsByLocale(locale), [locale]);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      const response = await fetch("/api/meta");
      const json = (await response.json()) as MetaResponse & { error?: string };
      if (!response.ok) {
        setMetaError(json.error ?? "Failed to load CRM setup snapshot.");
        return;
      }
      setMeta(json);
    }
    void loadMeta();
  }, []);

  const roleStats = useMemo(() => {
    const stats = new Map<string, number>();
    for (const profile of meta?.profiles ?? []) {
      stats.set(profile.role, (stats.get(profile.role) ?? 0) + 1);
    }
    return Array.from(stats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [meta?.profiles]);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{content.title}</h1>
        <p>{content.subtitle}</p>
      </section>

      <section className="panel stack">
        <h2>{content.onboardingTitle}</h2>
        <ol>
          {content.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="panel stack">
        <h2>{content.roleTitle}</h2>
        <ul>
          {content.roles.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="setup-archive" className="panel stack">
        <h2>CRM setup snapshot (moved from Settings)</h2>
        <p className="muted">
          Pipeline stages, email templates, and team role distribution are now documented here.
        </p>
        {metaError ? <p className="error">{metaError}</p> : null}
        {!meta && !metaError ? <p className="small">Loading setup snapshot...</p> : null}
        {meta ? (
          <>
            <div className="card-grid card-grid-wide">
              <article className="card stack">
                <strong>Pipeline stages</strong>
                <span className="kpi">{meta.stages.length}</span>
              </article>
              <article className="card stack">
                <strong>Email templates</strong>
                <span className="kpi">{meta.templates.length}</span>
              </article>
              <article className="card stack">
                <strong>Active templates</strong>
                <span className="kpi">{meta.templates.filter((item) => item.is_active).length}</span>
              </article>
              <article className="card stack">
                <strong>Team members</strong>
                <span className="kpi">{meta.profiles.length}</span>
              </article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Stage order</th>
                    <th>Stage name</th>
                    <th>Closed stage</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.stages.map((stage) => (
                    <tr key={stage.id}>
                      <td>{stage.sort_order}</td>
                      <td>{stage.name}</td>
                      <td>{stage.is_closed ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Template name</th>
                    <th>Event type</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.templates.map((template) => (
                    <tr key={template.id}>
                      <td>{template.name}</td>
                      <td>{template.event_type}</td>
                      <td>{template.subject}</td>
                      <td>{template.is_active ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Users</th>
                  </tr>
                </thead>
                <tbody>
                  {roleStats.map(([role, count]) => (
                    <tr key={role}>
                      <td>{role}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="panel stack">
        <h2>{content.faqTitle}</h2>
        <div className="stack">
          {faqs.map((item) => (
            <article key={item.q} className="faq-item">
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <h2>{content.directionTitle}</h2>
        <p>{content.directionBody}</p>
      </section>
    </div>
  );
}
