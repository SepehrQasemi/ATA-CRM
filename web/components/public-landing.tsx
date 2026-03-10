"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";

const featureIcons = ["📈", "🧩", "📬", "📊"] as const;

export function PublicLanding() {
  const { tr } = useLocale();

  return (
    <div className="landing-wrap">
      <header className="landing-nav">
        <BrandLogo />
        <div className="inline-actions">
          <LanguageSwitcher />
          <Link href="/help" className="btn btn-secondary">
            {tr("Help Center")}
          </Link>
          <Link href="/login" className="btn btn-primary">
            {tr("Get Started")}
          </Link>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1>{tr("Built for sales teams in food trading")}</h1>
          <p>{tr("Pipeline, follow-up automation, KPI and collaboration in one place.")}</p>
          <div className="inline-actions">
            <Link href="/login" className="btn btn-primary">
              {tr("Login")}
            </Link>
            <Link href="/login" className="btn btn-secondary">
              {tr("Signup")}
            </Link>
          </div>
        </section>

        <section className="landing-section panel">
          <div className="section-title">
            <h2>{tr("How it works")}</h2>
          </div>
          <ol className="landing-steps">
            <li>{tr("Company + Contact setup")}</li>
            <li>{tr("Lead qualification and pipeline movement")}</li>
            <li>{tr("Tasks, reminders, and follow-up emails")}</li>
            <li>{tr("KPI dashboard and export reports")}</li>
          </ol>
        </section>

        <section className="landing-section">
          <div className="feature-grid">
            {[tr("Leads"), tr("Tasks"), tr("Emails"), tr("Dashboard")].map((title, idx) => (
              <article key={title} className="feature-card">
                <span className="feature-icon">{featureIcons[idx]}</span>
                <h3>{title}</h3>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
