"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type SearchItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

type SearchResults = {
  leads: SearchItem[];
  companies: SearchItem[];
  contacts: SearchItem[];
};

const initialResults: SearchResults = {
  leads: [],
  companies: [],
  contacts: [],
};

export function GlobalSearch() {
  const { tr } = useLocale();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>(initialResults);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(initialResults);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const [leadsRes, companiesRes, contactsRes] = await Promise.all([
          fetch(`/api/leads?q=${encodeURIComponent(trimmed)}`),
          fetch(`/api/companies?q=${encodeURIComponent(trimmed)}`),
          fetch(`/api/contacts?q=${encodeURIComponent(trimmed)}`),
        ]);

        const leadsJson = (await leadsRes.json().catch(() => ({}))) as { leads?: Array<{ id: string; title: string; source?: string | null }> };
        const companiesJson = (await companiesRes.json().catch(() => ({}))) as { companies?: Array<{ id: string; name: string; sector?: string | null }> };
        const contactsJson = (await contactsRes.json().catch(() => ({}))) as { contacts?: Array<{ id: string; first_name: string; last_name: string; email?: string | null }> };

        setResults({
          leads: (leadsJson.leads ?? []).slice(0, 4).map((lead) => ({
            id: lead.id,
            label: lead.title,
            sublabel: lead.source ?? undefined,
            href: "/leads",
          })),
          companies: (companiesJson.companies ?? []).slice(0, 4).map((company) => ({
            id: company.id,
            label: company.name,
            sublabel: company.sector ?? undefined,
            href: "/companies",
          })),
          contacts: (contactsJson.contacts ?? []).slice(0, 4).map((contact) => ({
            id: contact.id,
            label: `${contact.first_name} ${contact.last_name}`,
            sublabel: contact.email ?? undefined,
            href: "/contacts",
          })),
        });
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [q]);

  const hasResults = useMemo(
    () =>
      results.leads.length > 0 ||
      results.companies.length > 0 ||
      results.contacts.length > 0,
    [results],
  );

  return (
    <div className="search-box">
      <label className="stack">
        <span className="small">{tr("Global Search")}</span>
        <input
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          placeholder={tr("Search")}
        />
      </label>

      {open ? (
        <div className="search-results">
          {loading ? <p className="small">{tr("Loading data...")}</p> : null}
          {!loading && q.trim().length >= 2 && !hasResults ? (
            <p className="small">{tr("No results yet.")}</p>
          ) : null}

          {!loading && hasResults ? (
            <div className="stack">
              {results.leads.length > 0 ? (
                <ResultGroup title={tr("Leads")} items={results.leads} />
              ) : null}
              {results.companies.length > 0 ? (
                <ResultGroup title={tr("Companies")} items={results.companies} />
              ) : null}
              {results.contacts.length > 0 ? (
                <ResultGroup title={tr("Contacts")} items={results.contacts} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultGroup({ title, items }: { title: string; items: SearchItem[] }) {
  return (
    <section className="stack">
      <strong>{title}</strong>
      <div className="stack">
        {items.map((item) => (
          <Link key={`${title}-${item.id}`} href={item.href} className="search-item">
            <span>{item.label}</span>
            {item.sublabel ? <span className="small">{item.sublabel}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
