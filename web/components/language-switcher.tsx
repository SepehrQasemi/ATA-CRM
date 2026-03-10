"use client";

import clsx from "clsx";
import { Locale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

const options: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
  { value: "fa", label: "FA" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={clsx("lang-switch", compact && "compact")} role="group" aria-label="Language switcher">
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
