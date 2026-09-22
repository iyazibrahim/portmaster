import en from "./messages/en.json";
import ms from "./messages/ms.json";

export type Locale = "en" | "ms";
export type MessageCatalog = Record<string, string>;

export const catalogs: Record<Locale, MessageCatalog> = { en, ms };

export function getCatalog(locale: Locale): MessageCatalog {
  return catalogs[locale] ?? catalogs.en;
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`,
  );
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  return interpolate(raw, vars);
}
