"use client";

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  interpolate,
  type Locale,
  type MessageCatalog,
} from "@/i18n/core";

type LocaleContextValue = {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: MessageCatalog;
  children: ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, vars) => interpolate(messages[key] ?? key, vars),
    }),
    [locale, messages],
  );

  return createElement(LocaleContext.Provider, { value }, children);
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en" as Locale,
      t: (key: string, vars?: Record<string, string | number>) =>
        interpolate(key, vars),
    };
  }
  return ctx;
}
