import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LegalShell } from "@/components/legal/legal-shell";
import { getTranslator } from "@/i18n";
import { getOrgContact } from "@/lib/org-contact";

export default async function PolicyPage() {
  const { t } = await getTranslator();
  const org = await getOrgContact();
  const contactBits = [
    org.email,
    org.phone,
  ].filter(Boolean) as string[];

  return (
    <LegalShell
      title={t("legal.policyTitle")}
      subtitle={`${t("legal.updated")} · ${t("legal.policySub")}`}
      navPrivacy={t("legal.privacy")}
      navCookies={t("legal.cookies")}
      navConsent={t("legal.consent")}
      navTerms={t("legal.terms")}
    >
      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>{t("legal.policyIntro")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.dataUser")}
        </h2>
        <p>{t("legal.dataUserBody", { org: org.name })}</p>
        {contactBits.length > 0 ? (
          <p>
            {t("legal.contactLabel")}:{" "}
            <span className="font-medium">{contactBits.join(" · ")}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">{t("legal.contactPending")}</p>
        )}

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.dataCollect")}
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("legal.dataCollect.1")}</li>
          <li>{t("legal.dataCollect.2")}</li>
          <li>{t("legal.dataCollect.3")}</li>
          <li>{t("legal.dataCollect.4")}</li>
          <li>{t("legal.dataCollect.5")}</li>
        </ul>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.purpose")}
        </h2>
        <p>{t("legal.purposeIntro")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("legal.purpose.1")}</li>
          <li>{t("legal.purpose.2")}</li>
          <li>{t("legal.purpose.3")}</li>
          <li>{t("legal.purpose.4")}</li>
          <li>{t("legal.purpose.5")}</li>
          <li>{t("legal.purpose.6")}</li>
        </ul>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.basis")}
        </h2>
        <p>{t("legal.basisBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.disclosure")}
        </h2>
        <p>{t("legal.disclosureBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.retention")}
        </h2>
        <p>{t("legal.retentionBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.rights")}
        </h2>
        <p>{t("legal.rightsBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.security")}
        </h2>
        <p>{t("legal.securityBody")}</p>

        <h2 className="text-base font-semibold tracking-tight">
          {t("legal.safety")}
        </h2>
        <p>{t("legal.safetyBody")}</p>
        <p>
          {t("legal.safetyTermsLink")}{" "}
          <Link
            href="/terms"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("legal.linkTerms")}
          </Link>
          .
        </p>
      </section>
      <div className="flex flex-wrap gap-3">
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
        <Link
          href="/cookies"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          {t("legal.linkCookies")}
        </Link>
      </div>
    </LegalShell>
  );
}
