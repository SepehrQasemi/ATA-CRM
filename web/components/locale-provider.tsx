"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Locale, normalizeLocale, isRtlLocale, t } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  isRtl: boolean;
  tr: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const LOCALE_STORAGE_KEY = "crm_locale";

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LOCALE_STORAGE_KEY) : null;
    const normalized = normalizeLocale(stored);
    if (normalized !== locale) {
      setLocaleState(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = isRtlLocale(locale) ? "rtl" : "ltr";
    root.dataset.locale = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.cookie = `crm_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      isRtl: isRtlLocale(locale),
      tr: (key, vars) => t(locale, key, vars),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
}
