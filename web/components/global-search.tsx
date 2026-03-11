"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

type SearchItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

type SearchResults = {
  leads: SearchItem[];
  tasks: SearchItem[];
  companies: SearchItem[];
  contacts: SearchItem[];
  products: SearchItem[];
  categories: SearchItem[];
  colleagues: SearchItem[];
};

const initialResults: SearchResults = {
  leads: [],
  tasks: [],
  companies: [],
  contacts: [],
  products: [],
  categories: [],
  colleagues: [],
};

export function GlobalSearch() {
  const { tr } = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>(initialResults);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults(initialResults);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=5`,
        );
        const json = (await response.json().catch(() => ({}))) as {
          results?: SearchResults;
        };
        setResults(json.results ?? initialResults);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [q]);

  const hasResults = useMemo(
    () =>
      results.leads.length > 0 ||
      results.tasks.length > 0 ||
      results.companies.length > 0 ||
      results.contacts.length > 0 ||
      results.products.length > 0 ||
      results.categories.length > 0 ||
      results.colleagues.length > 0,
    [results],
  );

  const firstResult = useMemo(() => {
    const ordered = [
      ...results.companies,
      ...results.contacts,
      ...results.products,
      ...results.categories,
      ...results.colleagues,
      ...results.leads,
      ...results.tasks,
    ];
    return ordered[0] ?? null;
  }, [results]);

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
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
            if (event.key === "Enter" && firstResult) {
              event.preventDefault();
              router.push(firstResult.href);
            }
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          placeholder={tr("Search everything")}
        />
      </label>

      {open ? (
        <div className="search-results">
          {loading ? <p className="small">{tr("Loading data...")}</p> : null}
          {!loading && q.trim().length >= 1 && !hasResults ? (
            <p className="small">{tr("No results found.")}</p>
          ) : null}

          {!loading && hasResults ? (
            <div className="stack">
              {results.companies.length > 0 ? (
                <ResultGroup title={tr("Companies")} items={results.companies} />
              ) : null}
              {results.contacts.length > 0 ? (
                <ResultGroup title={tr("Contacts")} items={results.contacts} />
              ) : null}
              {results.products.length > 0 ? (
                <ResultGroup title={tr("Products")} items={results.products} />
              ) : null}
              {results.categories.length > 0 ? (
                <ResultGroup title={tr("Categories")} items={results.categories} />
              ) : null}
              {results.colleagues.length > 0 ? (
                <ResultGroup title={tr("Colleagues")} items={results.colleagues} />
              ) : null}
              {results.leads.length > 0 ? (
                <ResultGroup title={tr("Leads")} items={results.leads} />
              ) : null}
              {results.tasks.length > 0 ? (
                <ResultGroup title={tr("Tasks")} items={results.tasks} />
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
