import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { db } from "@/db";
import { handlers, jetties, users } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ageFromDob,
  formatEnumLabel,
  roleLabel,
} from "@/lib/utils-app";
import { getTranslator } from "@/i18n";
import { ChangePasswordButton } from "@/components/profile/change-password-form";
import { ProfilePhotoCard } from "@/components/profile/profile-photo-card";
import {
  DeleteAccountButton,
  EditProfileButton,
} from "@/components/profile/profile-account-actions";

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await requireSession();
  const { t } = await getTranslator();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const role = session.user.role;
  const isOperator = role === "HANDLER";
  const isAngler = role === "USER";
  const canSelfDelete = role === "USER" || role === "HANDLER" || role === "LLM_VIEWER";

  let operatorJetty: string | null = null;
  let licenseNo: string | null = null;
  if (isOperator) {
    const [row] = await db
      .select({
        jettyName: jetties.name,
        licenseNo: handlers.licenseNo,
      })
      .from(handlers)
      .innerJoin(jetties, eq(handlers.jettyId, jetties.id))
      .where(eq(handlers.userId, session.user.id))
      .limit(1);
    operatorJetty = row?.jettyName ?? null;
    licenseNo = row?.licenseNo ?? null;
  }

  const age =
    user?.dob != null && user.dob.length > 0 ? ageFromDob(user.dob) : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 lg:max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isOperator ? t("profile.accountTitle") : t("profile.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isOperator ? t("profile.operatorSub") : t("profile.sub")}
        </p>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="border-b border-border/60 bg-[linear-gradient(160deg,oklch(0.97_0.01_250),oklch(0.99_0.005_230))] px-4 py-5 sm:px-5">
          {isAngler ? (
            <ProfilePhotoCard photoKey={user?.photoKey ?? null} compact />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {(session.user.name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">
                  {session.user.name}
                </p>
                <Badge className="mt-1">{roleLabel(role)}</Badge>
              </div>
            </div>
          )}
        </div>

        <CardContent className="space-y-6 px-4 py-5 sm:px-5">
          {isAngler ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold tracking-tight">
                {session.user.name}
              </p>
              <Badge>{roleLabel(role)}</Badge>
              {user?.accountStatus && user.accountStatus !== "ACTIVE" ? (
                <Badge variant="destructive">
                  {formatEnumLabel(user.accountStatus)}
                </Badge>
              ) : null}
            </div>
          ) : null}

          <dl className="grid gap-4 sm:grid-cols-2">
            {!isAngler ? (
              <>
                <Field label="Name" value={session.user.name} />
                <Field
                  label="Email"
                  value={
                    <span className="break-all">{session.user.email}</span>
                  }
                />
              </>
            ) : (
              <Field
                label="Email"
                value={
                  <span className="break-all">{session.user.email}</span>
                }
              />
            )}
            <Field label="Mobile" value={user?.phone ?? "—"} />
            {isAngler ? (
              <>
                <Field
                  label="MyKad"
                  value={
                    user?.myKadLast4
                      ? `•••• •••• ${user.myKadLast4}`
                      : "—"
                  }
                />
                <Field
                  label="Date of birth"
                  value={
                    user?.dob
                      ? `${user.dob}${age != null ? ` · age ${age}` : ""}`
                      : "—"
                  }
                />
                <Field
                  label="Citizenship"
                  value={
                    user?.citizenship === "MY"
                      ? "Malaysian"
                      : user?.citizenship
                        ? formatEnumLabel(user.citizenship)
                        : "—"
                  }
                />
                <Field
                  label="Emergency contact"
                  value={
                    user?.emergencyContactName || user?.emergencyContact
                      ? `${user?.emergencyContactName ?? "—"}${
                          user?.emergencyContact
                            ? ` · ${user.emergencyContact}`
                            : ""
                        }`
                      : "—"
                  }
                />
                <Field
                  label="Residential address"
                  value={user?.address ?? "—"}
                  wide
                />
              </>
            ) : null}
            {isOperator ? (
              <>
                <Field label="Registered jetty" value={operatorJetty ?? "—"} />
                <Field label="License" value={licenseNo ?? "—"} />
                <Field label="Role" value={<Badge>{roleLabel(role)}</Badge>} />
              </>
            ) : null}
            {!isAngler && !isOperator ? (
              <Field label="Role" value={<Badge>{roleLabel(role)}</Badge>} />
            ) : null}
            {isAngler ? (
              <Field
                label="Consents"
                wide
                value={
                  <span className="font-normal text-muted-foreground">
                    Policy
                    {user?.policyAcceptedAt ? " ✓" : " —"} · PDPA
                    {user?.pdpaAcceptedAt ? " ✓" : " —"} · Location
                    {user?.locationConsentAt ? " ✓" : " —"}
                  </span>
                }
              />
            ) : null}
          </dl>

          <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:flex-wrap">
            {isAngler ? (
              <EditProfileButton
                className="min-h-11 w-full sm:w-auto"
                initial={{
                  phone: user?.phone ?? "",
                  emergencyContactName: user?.emergencyContactName ?? "",
                  emergencyContact: user?.emergencyContact ?? "",
                  address: user?.address ?? "",
                }}
              />
            ) : null}
            <ChangePasswordButton className="min-h-11 w-full sm:w-auto" />
            <form action={logoutAction} className="w-full sm:ml-auto sm:w-auto">
              <Button
                type="submit"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
              >
                Sign out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {canSelfDelete ? (
        <Card className="border-border/80">
          <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-sm font-medium">Privacy &amp; data</p>
              <p className="text-xs text-muted-foreground">
                Delete and anonymise your account under PDPA. Pass history may
                be retained anonymously for audit.
              </p>
            </div>
            <DeleteAccountButton className="min-h-11 w-full border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto" />
          </CardContent>
        </Card>
      ) : null}

      {isOperator ? (
        <p className="text-sm text-muted-foreground">
          Need a jetty change? Ask Association Admin — operators cannot
          self-register.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Read our{" "}
          <Link
            href="/policy"
            className="text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          ,{" "}
          <Link
            href="/cookies"
            className="text-primary underline-offset-4 hover:underline"
          >
            Cookies
          </Link>
          , and{" "}
          <Link
            href="/consent"
            className="text-primary underline-offset-4 hover:underline"
          >
            Consent
          </Link>
          .
        </p>
      )}
    </div>
  );
}
