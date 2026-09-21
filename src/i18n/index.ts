import { cookies } from "next/headers";
import en from "./messages/en.json";
import ms from "./messages/ms.json";

export type Locale = "en" | "ms";
export const LOCALE_COOKIE = "tiangpass_locale";

const catalogs: Record<Locale, Record<string, string>> = { en, ms };

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return raw === "ms" ? "ms" : "en";
}

export function t(locale: Locale, key: string): string {
  return catalogs[locale][key] ?? catalogs.en[key] ?? key;
}

export async function getTranslator() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: string) => t(locale, key),
  };
}
