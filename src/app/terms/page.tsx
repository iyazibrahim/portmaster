import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LegalShell } from "@/components/legal/legal-shell";
import { getTranslator } from "@/i18n";
import { getOrgContact } from "@/lib/org-contact";

export default async function TermsPage() {
  const { t } = await getTranslator();
  const org = await getOrgContact();

  return (
    <LegalShell
      title={t("legal.termsTitle")}
      subtitle={`${t("legal.updated")} · ${t("legal.termsSub")}`}
      navPrivacy={t("legal.privacy")}
      navCookies={t("legal.cookies")}
      navConsent={t("legal.consent")}
      navTerms={t("legal.terms")}
    >
      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>{t("legal.termsIntro", { org: org.name })}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.acceptance")}
        </h2>
        <p>{t("legal.terms.acceptanceBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.service")}
        </h2>
        <p>{t("legal.terms.serviceBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.eligibility")}
        </h2>
        <p>{t("legal.terms.eligibilityBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.conduct")}
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("legal.terms.conduct.1")}</li>
          <li>{t("legal.terms.conduct.2")}</li>
          <li>{t("legal.terms.conduct.3")}</li>
          <li>{t("legal.terms.conduct.4")}</li>
        </ul>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.refund")}
        </h2>
        <p>{t("legal.terms.refundBody")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("legal.terms.refund.1")}</li>
          <li>{t("legal.terms.refund.2")}</li>
          <li>{t("legal.terms.refund.3")}</li>
          <li>{t("legal.terms.refund.4")}</li>
        </ul>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.liability")}
        </h2>
        <p>{t("legal.terms.liabilityBody")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("legal.terms.liability.1")}</li>
          <li>{t("legal.terms.liability.2")}</li>
          <li>{t("legal.terms.liability.3")}</li>
          <li>{t("legal.terms.liability.4")}</li>
        </ul>
        <p>{t("legal.terms.liabilityAck")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.indemnity")}
        </h2>
        <p>{t("legal.terms.indemnityBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.changes")}
        </h2>
        <p>{t("legal.terms.changesBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.terms.law")}
        </h2>
        <p>{t("legal.terms.lawBody")}</p>
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
