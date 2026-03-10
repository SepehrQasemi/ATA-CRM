"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { roleLabel } from "@/lib/i18n";

type FaqItem = { q: string; a: string };
type MetaResponse = {
  profiles: Array<{ id: string; full_name: string | null; role: string }>;
  stages: Array<{ id: string; name: string; sort_order: number; is_closed: boolean }>;
  templates: Array<{ id: string; name: string; event_type: string; subject: string; is_active: boolean }>;
};

function contentByLocale(locale: "en" | "fr") {
  if (locale === "fr") {
    return {
      title: "Centre d'aide",
      subtitle: "Démarrage rapide, FAQ et guide par rôle.",
      onboardingTitle: "Démarrage rapide",
      steps: [
        "Créer une entreprise et un contact.",
        "Créer un produit puis lier les relations échangées et potentielles.",
        "Créer une opportunité puis la faire avancer dans le pipeline.",
        "Créer une tâche et vérifier son affichage dans le calendrier.",
        "Envoyer un email test et vérifier les journaux d'envoi.",
        "Lire les KPI du tableau de bord puis exporter en CSV/PDF.",
      ],
      roleTitle: "Guide des rôles",
      roles: [
        "admin : accès complet, configuration et supervision.",
        "manager : pilotage de l'équipe et validation des actions.",
        "commercial : gestion opérationnelle des opportunités, tâches et emails.",
        "standard_user : accès standard aux données autorisées.",
      ],
      faqTitle: "Questions fréquentes",
      directionTitle: "Langue et interface",
      directionBody:
        "Utilisez le sélecteur EN/FR dans l'en-tête. Le persan est temporairement archivé.",
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
      "manager: team supervision and approvals.",
      "commercial: daily operations for leads, tasks, and emails.",
      "standard_user: standard access to allowed data.",
    ],
    faqTitle: "Frequently Asked Questions",
    directionTitle: "Language & direction",
    directionBody: "Use the EN/FR switcher. Persian is temporarily archived.",
  };
}

function faqsByLocale(locale: "en" | "fr"): FaqItem[] {
  if (locale === "fr") {
    return [
      {
        q: "Comment créer une opportunité rapidement ?",
        a: "Allez dans Opportunités, remplissez le formulaire puis cliquez sur créer.",
      },
      {
        q: "Comment changer une étape du pipeline ?",
        a: "Utilisez la sélection d'étape ou les boutons Précédent/Suivant sur chaque carte.",
      },
      {
        q: "Comment enregistrer mes filtres ?",
        a: "Dans Opportunités et Tâches, utilisez le bouton Enregistrer les filtres.",
      },
      {
        q: "Comment envoyer un email test ?",
        a: "Dans Emails, section Email test, choisissez un modèle et un contact.",
      },
      {
        q: "Comment exécuter la relance 72h ?",
        a: "Dans Emails, lancez d'abord la simulation puis l'envoi réel.",
      },
      {
        q: "Comment voir les tâches urgentes ?",
        a: "La page Tâches affiche les retards, les échéances proches et les alertes.",
      },
      {
        q: "Comment exporter les KPI ?",
        a: "Le tableau de bord propose les boutons Export CSV et Export PDF.",
      },
      {
        q: "Où consulter les journaux d'emails ?",
        a: "Dans Emails, section Journaux email.",
      },
      {
        q: "Qui peut gérer les accès ?",
        a: "L'administrateur gère tous les rôles ; le manager a des droits intermédiaires.",
      },
      {
        q: "Comment lier un produit à une entreprise ?",
        a: "Dans Produits, utilisez la section Relations produit-entreprise.",
      },
      {
        q: "Comment repartir d'une démo propre ?",
        a: "Exécutez le script de seed démo puis suivez la checklist de soutenance.",
      },
      {
        q: "Puis-je utiliser l'interface en persan ?",
        a: "Pas pour cette version de soutenance. Utilisez EN ou FR.",
      },
    ];
  }

  return [
    { q: "How can I create a lead quickly?", a: "Open Leads, fill the form, then click create lead." },
    { q: "How do I move pipeline stages?", a: "Use stage selection or Prev/Next quick actions on lead cards." },
    { q: "How do saved filters work?", a: "Use Save filters in Leads and Tasks to persist your current filters." },
    { q: "How do I send a test email?", a: "Go to Emails, choose template + contact in the test email section." },
    { q: "How do I run 72h follow-up?", a: "Emails -> run dry-run first, then run real send." },
    { q: "Where can I see urgent tasks?", a: "Tasks shows overdue, due soon, and deadline alerts." },
    { q: "How do I export KPI reports?", a: "Dashboard offers Export CSV and Export PDF actions." },
    { q: "Where are email logs?", a: "Emails page -> Email logs section." },
    { q: "Who can manage access and roles?", a: "Admin manages all roles; manager has intermediate privileges." },
    { q: "How do I link products to companies?", a: "Products page -> Product-company relations form." },
    { q: "How do I reset demo data quickly?", a: "Run the demo seed script and follow the demo checklist." },
    { q: "Is Persian available now?", a: "Not in this presentation version. Use EN or FR." },
  ];
}

export default function HelpPage() {
  const { locale, tr } = useLocale();
  const activeLocale = locale === "fr" ? "fr" : "en";
  const content = useMemo(() => contentByLocale(activeLocale), [activeLocale]);
  const faqs = useMemo(() => faqsByLocale(activeLocale), [activeLocale]);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      const response = await fetch("/api/meta");
      const json = (await response.json()) as MetaResponse & { error?: string };
      if (!response.ok) {
        setMetaError(json.error ?? tr("Failed to load CRM setup snapshot."));
        return;
      }
      setMeta(json);
    }
    void loadMeta();
  }, [tr]);

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
        <h2>{tr("CRM setup snapshot (moved from Settings)")}</h2>
        <p className="muted">
          {tr("Pipeline stages, email templates, and team role distribution are now documented here.")}
        </p>
        {metaError ? <p className="error">{metaError}</p> : null}
        {!meta && !metaError ? <p className="small">{tr("Loading setup snapshot...")}</p> : null}
        {meta ? (
          <>
            <div className="card-grid card-grid-wide">
              <article className="card stack">
                <strong>{tr("Pipeline stages")}</strong>
                <span className="kpi">{meta.stages.length}</span>
              </article>
              <article className="card stack">
                <strong>{tr("Email templates")}</strong>
                <span className="kpi">{meta.templates.length}</span>
              </article>
              <article className="card stack">
                <strong>{tr("Active templates")}</strong>
                <span className="kpi">{meta.templates.filter((item) => item.is_active).length}</span>
              </article>
              <article className="card stack">
                <strong>{tr("Team members")}</strong>
                <span className="kpi">{meta.profiles.length}</span>
              </article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tr("Stage order")}</th>
                    <th>{tr("Stage name")}</th>
                    <th>{tr("Closed stage")}</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.stages.map((stage) => (
                    <tr key={stage.id}>
                      <td>{stage.sort_order}</td>
                      <td>{tr(stage.name)}</td>
                      <td>{stage.is_closed ? tr("Yes") : tr("No")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tr("Template name")}</th>
                    <th>{tr("Event type")}</th>
                    <th>{tr("Subject")}</th>
                    <th>{tr("Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.templates.map((template) => (
                    <tr key={template.id}>
                      <td>{template.name}</td>
                      <td>{template.event_type}</td>
                      <td>{template.subject}</td>
                      <td>{template.is_active ? tr("Active") : tr("Inactive")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tr("Role")}</th>
                    <th>{tr("Users")}</th>
                  </tr>
                </thead>
                <tbody>
                  {roleStats.map(([role, count]) => (
                    <tr key={role}>
                      <td>{roleLabel(role, activeLocale)}</td>
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
