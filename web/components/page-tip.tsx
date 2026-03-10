"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";

const STORAGE_KEY = "crm_tips_dismissed";

function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function setDismissed(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function PageTip({
  id,
  title,
  detail,
}: {
  id: string;
  title: string;
  detail: string;
}) {
  const { tr } = useLocale();
  const [dismissed, setDismissedState] = useState<string[]>([]);

  useEffect(() => {
    setDismissedState(getDismissed());
  }, []);

  const hidden = useMemo(() => dismissed.includes(id), [dismissed, id]);

  if (hidden) return null;

  return (
    <section className="tip-box">
      <div className="inline-actions">
        <strong>{title}</strong>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            const next = [...new Set([...dismissed, id])];
            setDismissed(next);
            setDismissedState(next);
          }}
        >
          {tr("Dismiss")}
        </button>
      </div>
      <p className="muted">{detail}</p>
    </section>
  );
}
