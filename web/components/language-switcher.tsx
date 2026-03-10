"use client";

import clsx from "clsx";
import { Locale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

const options: Array<{ value: Extract<Locale, "en" | "fr">; label: string }> = [
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, tr } = useLocale();

  return (
    <div
      className={clsx("lang-switch", compact && "compact")}
      role="group"
      aria-label={tr("Language switcher")}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={clsx("lang-btn", locale === option.value && "active")}
          onClick={() => setLocale(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
