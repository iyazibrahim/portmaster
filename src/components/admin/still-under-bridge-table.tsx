"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionAdminForceCheckOut } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useT } from "@/i18n/locale-provider";

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export type StillUnderRow = {
  passId: string;
  name: string;
  pillar: string;
  expectedReturnOn: string | null;
  durationMin: number;
};

export function StillUnderBridgeTable({
  rows,
  overdueHours,
}: {
  rows: StillUnderRow[];
  overdueHours: number;
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<StillUnderRow | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setActive(null);
    setReason("");
    setError(null);
  }

  function confirm() {
    if (!active) return;
    setError(null);
    startTransition(async () => {
      const result = await actionAdminForceCheckOut({
        passId: active.passId,
        reason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        t("admin.ops.forceCheckoutDone", { ref: result.reference }),
      );
      close();
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-3">
        <h3 className="text-base font-semibold tracking-tight">
          {t("admin.ops.stillUnderTitle")}
        </h3>
        <p className="text-xs leading-normal text-muted-foreground">
          {t("admin.ops.stillUnderHint", { hours: overdueHours })}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("admin.col.pillar")}</TableHead>
              <TableHead>{t("admin.col.expectedReturn")}</TableHead>
              <TableHead>{t("admin.col.duration")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  {t("admin.ops.noLongStays")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.passId}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.pillar}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.expectedReturnOn ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium text-amber-800">
                    {formatDuration(r.durationMin)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => {
                        setActive(r);
                        setReason("");
                        setError(null);
                      }}
                    >
                      {t("admin.ops.forceCheckout")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={active != null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.ops.forceCheckoutTitle")}</DialogTitle>
            <DialogDescription>
              {active
                ? t("admin.ops.forceCheckoutBody", {
                    name: active.name,
                    pillar: active.pillar,
                  })
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="force-reason">
              {t("admin.ops.forceCheckoutReason")}
            </Label>
            <Textarea
              id="force-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder={t("admin.ops.forceCheckoutReasonPh")}
              className="min-h-24"
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("admin.ops.forceCheckoutAuditHint")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={close}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending || reason.trim().length < 3}
              onClick={confirm}
            >
              {pending ? t("common.loading") : t("admin.ops.forceCheckoutConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
