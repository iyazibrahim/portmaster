import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers } from "@/db/schema";
import { formatMYR } from "@/lib/utils-app";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function HandlerEarningsPage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, session.user.id))
    .limit(1);

  if (!handler) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No handler profile</AlertTitle>
        <AlertDescription>Cannot show earnings.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>
        <p className="text-muted-foreground">Mock ledger for demo ops.</p>
      </div>
      <p className="text-3xl font-semibold tracking-tight">
        {formatMYR(handler.mockEarningsCents)}
      </p>
      <p className="text-sm text-muted-foreground">
        Accrues on successful check-in (booking total credited for demo).
      </p>
    </div>
  );
}
