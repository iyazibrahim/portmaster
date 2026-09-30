import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LegalShell } from "@/components/legal/legal-shell";
import { getTranslator } from "@/i18n";

export default async function CookiesPage() {
  const { t } = await getTranslator();

  return (
    <LegalShell
      title={t("legal.cookiesTitle")}
      subtitle={t("legal.updated")}
      navPrivacy={t("legal.privacy")}
      navCookies={t("legal.cookies")}
      navConsent={t("legal.consent")}
      navTerms={t("legal.terms")}
    >
      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          {t("legal.cookiesIntro")}{" "}
          <Link
            href="/policy"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("legal.linkPolicy")}
          </Link>
          .
        </p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.cookiesWhat")}
        </h2>
        <p>{t("legal.cookiesWhatBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.cookiesTableCat")}
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("legal.cookiesTableCat")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("legal.cookiesTablePurpose")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("legal.cookiesTableRequired")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-2 align-top font-medium">
                  {t("legal.cookiesNecessary")}
                </td>
                <td className="px-3 py-2 align-top">
                  {t("legal.cookiesNecessaryBody")}
                </td>
                <td className="px-3 py-2 align-top">{t("legal.cookiesYes")}</td>
              </tr>
              <tr className="border-b">
                <td className="px-3 py-2 align-top font-medium">
                  {t("legal.cookiesFunctional")}
                </td>
                <td className="px-3 py-2 align-top">
                  {t("legal.cookiesFunctionalBody")}
                </td>
                <td className="px-3 py-2 align-top">{t("legal.cookiesYes")}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 align-top font-medium">
                  {t("legal.cookiesAnalytics")}
                </td>
                <td className="px-3 py-2 align-top">
                  {t("legal.cookiesAnalyticsBody")}
                </td>
                <td className="px-3 py-2 align-top">{t("legal.cookiesNo")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.cookiesManage")}
        </h2>
        <p>{t("legal.cookiesManageBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.cookiesLocal")}
        </h2>
        <p>{t("legal.cookiesLocalBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.cookiesThird")}
        </h2>
        <p>{t("legal.cookiesThirdBody")}</p>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/policy"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          {t("legal.linkPolicy")}
        </Link>
        <Link
          href="/terms"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          {t("legal.linkTerms")}
        </Link>
        <Link
          href="/consent"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          {t("legal.linkConsent")}
        </Link>
      </div>
    </LegalShell>
  );
}
