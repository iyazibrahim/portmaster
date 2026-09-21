"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "@/i18n";
import { shouldUseSecureAuthCookies } from "@/lib/auth-cookies";

export async function actionSetLocale(locale: Locale) {
  const value = locale === "ms" ? "ms" : "en";
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, value, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    secure: shouldUseSecureAuthCookies(),
  });
  revalidatePath("/", "layout");
}
