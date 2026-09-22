import { cookies } from "next/headers";
import {
  getCatalog,
  translate,
  type Locale,
  type MessageCatalog,
} from "./core";

export type { Locale, MessageCatalog };
export { getCatalog, interpolate, translate as t } from "./core";
export const LOCALE_COOKIE = "tiangpass_locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return raw === "ms" ? "ms" : "en";
}

export async function getTranslator() {
  const locale = await getLocale();
  return {
    locale,
    messages: getCatalog(locale),
    t: (key: string, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
  };
}
