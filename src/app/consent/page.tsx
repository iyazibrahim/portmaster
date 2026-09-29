import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LegalShell } from "@/components/legal/legal-shell";
import { getTranslator } from "@/i18n";

export default async function ConsentPage() {
  const { t } = await getTranslator();

  return (
    <LegalShell
      title={t("legal.consentTitle")}
      subtitle={`${t("legal.updated")} · ${t("legal.consentSub")}`}
      navPrivacy={t("legal.privacy")}
      navCookies={t("legal.cookies")}
      navConsent={t("legal.consent")}
    >
      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          {t("legal.consentIntro")}{" "}
          <Link
            href="/policy"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("legal.linkPolicy")}
          </Link>
          .
        </p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.consentWhat")}
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.consent.1")}</li>
          <li>{t("legal.consent.2")}</li>
          <li>{t("legal.consent.3")}</li>
          <li>{t("legal.consent.4")}</li>
          <li>{t("legal.consent.5")}</li>
        </ul>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.consentWithdraw")}
        </h2>
        <p>{t("legal.consentWithdrawBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.consentChildren")}
        </h2>
        <p>{t("legal.consentChildrenBody")}</p>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/policy"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          {t("legal.linkPolicy")}
        </Link>
        <Link
          href="/cookies"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          {t("legal.linkCookies")}
        </Link>
        <Link href="/signup" className={cn(buttonVariants(), "min-h-11")}>
          {t("legal.backSignup")}
        </Link>
      </div>
    </LegalShell>
  );
}
