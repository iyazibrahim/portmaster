import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers } from "@/db/schema";
import { formatMYR } from "@/lib/utils-app";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslator } from "@/i18n";

export default async function HandlerEarningsPage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const { t } = await getTranslator();
  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, session.user.id))
    .limit(1);

  if (!handler) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("handler.noProfile")}</AlertTitle>
        <AlertDescription>{t("handler.noEarnings")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("handler.earningsTitle")}
        </h1>
        <p className="text-muted-foreground">{t("handler.earningsSub")}</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("handler.balance")}</CardTitle>
          <CardDescription>
            Accrues on successful check-in (booking total credited for demo).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatMYR(handler.mockEarningsCents)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
