"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { actionCancelPass } from "@/lib/actions/pass";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { canCancelPass } from "@/domain/pass";
import type { PassStatus } from "@/db/schema";

type Mode = "change" | "cancel";

/**
 * Pass detail action row: receipt + change pillar + cancel (red).
 * One horizontal line from `sm` up; stacked with clear gaps on mobile.
 */
export function PassDetailActions({
  passId,
  status,
  pillarName,
  showReceipt,
}: {
  passId: string;
  status: string;
  pillarName?: string | null;
  showReceipt: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("change");
  const canCancel = canCancelPass(status as PassStatus);

  if (!showReceipt && !canCancel) return null;

  function openDialog(next: Mode) {
    setMode(next);
    setOpen(true);
  }

  function confirm() {
    startTransition(async () => {
      const res = await actionCancelPass(passId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        mode === "change" ? t("pass.changePillarDone") : t("pass.cancelDone"),
      );
      setOpen(false);
      router.push("/pass");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
        {showReceipt ? (
          <Link
            href={`/pass/${passId}/receipt?print=1`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex min-h-11 w-full flex-1 justify-center sm:w-auto sm:min-w-[9rem]",
            )}
          >
            {t("pass.downloadReceipt")}
          </Link>
        ) : null}
        {canCancel ? (
          <>
            <Button
              type="button"
              className="min-h-11 w-full flex-1 sm:w-auto sm:min-w-[9rem]"
              disabled={pending}
              onClick={() => openDialog("change")}
            >
              {t("pass.changePillar")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto sm:min-w-[9rem]"
              disabled={pending}
              onClick={() => openDialog("cancel")}
            >
              {t("pass.cancelPass")}
            </Button>
          </>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "change"
                ? t("pass.changePillarTitle")
                : t("pass.cancelPassTitle")}
            </DialogTitle>
            <DialogDescription className="space-y-2 text-left">
              <span className="block">
                {mode === "change"
                  ? t("pass.changePillarBody", {
                      pillar: pillarName?.trim() || "—",
                    })
                  : t("pass.cancelPassBody")}
              </span>
              <span className="block text-amber-800 dark:text-amber-200">
                {t("pass.cancelNoRefund")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className={cn(
                "min-h-11",
                mode === "cancel" &&
                  "bg-destructive text-white hover:bg-destructive/90",
              )}
              disabled={pending}
              onClick={confirm}
            >
              {pending
                ? t("common.loading")
                : mode === "change"
                  ? t("pass.changePillarConfirm")
                  : t("pass.cancelPassConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Angler cancel / change-pillar for trips list and buy gate (no receipt).
 */
export function CancelPassActions({
  passId,
  status,
  pillarName,
  className,
  layout = "stack",
}: {
  passId: string;
  status: string;
  pillarName?: string | null;
  className?: string;
  layout?: "stack" | "inline";
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("change");

  if (!canCancelPass(status as PassStatus)) return null;

  function openDialog(next: Mode) {
    setMode(next);
    setOpen(true);
  }

  function confirm() {
    startTransition(async () => {
      const res = await actionCancelPass(passId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        mode === "change" ? t("pass.changePillarDone") : t("pass.cancelDone"),
      );
      setOpen(false);
      router.push("/pass");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        layout === "inline"
          ? "flex flex-wrap gap-3"
          : "flex flex-col gap-3 sm:flex-row sm:flex-wrap",
        className,
      )}
    >
      <Button
        type="button"
        className="min-h-11 w-full sm:w-auto"
        disabled={pending}
        onClick={() => openDialog("change")}
      >
        {t("pass.changePillar")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
        disabled={pending}
        onClick={() => openDialog("cancel")}
      >
        {t("pass.cancelPass")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "change"
                ? t("pass.changePillarTitle")
                : t("pass.cancelPassTitle")}
            </DialogTitle>
            <DialogDescription className="space-y-2 text-left">
              <span className="block">
                {mode === "change"
                  ? t("pass.changePillarBody", {
                      pillar: pillarName?.trim() || "—",
                    })
                  : t("pass.cancelPassBody")}
              </span>
              <span className="block text-amber-800 dark:text-amber-200">
                {t("pass.cancelNoRefund")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className={cn(
                "min-h-11",
                mode === "cancel" &&
                  "bg-destructive text-white hover:bg-destructive/90",
              )}
              disabled={pending}
              onClick={confirm}
            >
              {pending
                ? t("common.loading")
                : mode === "change"
                  ? t("pass.changePillarConfirm")
                  : t("pass.cancelPassConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
