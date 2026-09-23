"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionUpdateHandler } from "@/lib/actions/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { useT } from "@/i18n/locale-provider";

export type OperatorAdminRow = {
  id: string;
  displayName: string;
  licenseNo: string | null;
  jettyId: string;
  jetty: string | null;
  ownerId: string | null;
  owner: string | null;
  email: string | null;
  userId: string | null;
};

type Option = { id: string; name: string };

export function OperatorsAdminTable({
  rows,
  jetties,
  owners,
}: {
  rows: OperatorAdminRow[];
  jetties: Option[];
  owners: Option[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [active, setActive] = useState<OperatorAdminRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [jettyId, setJettyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [licenseNo, setLicenseNo] = useState("");

  const jettyOptions = useMemo(
    () => jetties.map((j) => ({ value: j.id, label: j.name })),
    [jetties],
  );
  const ownerOptions = useMemo(
    () => [
      { value: "", label: t("admin.operators.noOwner") },
      ...owners.map((o) => ({ value: o.id, label: o.name })),
    ],
    [owners, t],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.displayName.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.jetty ?? "").toLowerCase().includes(q) ||
        (r.owner ?? "").toLowerCase().includes(q) ||
        (r.licenseNo ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  function openEdit(r: OperatorAdminRow) {
    setActive(r);
    setDisplayName(r.displayName);
    setJettyId(r.jettyId || jetties[0]?.id || "");
    setOwnerId(r.ownerId ?? "");
    setLicenseNo(r.licenseNo ?? "");
    setEditOpen(true);
  }

  return (
    <>
      <AdminDataTable
        items={filtered}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder={t("admin.operators.searchPh")}
        emptyMessage={t("admin.operators.empty")}
      >
        {(pageItems) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3">{t("common.name")}</TableHead>
                <TableHead className="px-3">{t("common.email")}</TableHead>
                <TableHead className="px-3">{t("common.jetty")}</TableHead>
                <TableHead className="px-3">{t("common.owner")}</TableHead>
                <TableHead className="px-3">{t("common.licence")}</TableHead>
                <TableHead className="w-[6rem] px-3">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-3 py-2 font-medium">
                    {r.displayName}
                  </TableCell>
                  <TableCell className="break-all px-3 py-2 text-sm">
                    {r.email ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate px-3 py-2">
                    {r.jetty ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2">{r.owner ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs">
                    {r.licenseNo ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(r)}
                    >
                      {t("common.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminDataTable>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-visible sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.operators.edit")}</DialogTitle>
            <DialogDescription>{t("admin.operators.editDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("admin.people.displayName")}</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("common.email")}</Label>
              <Input value={active?.email ?? ""} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("common.jetty")}</Label>
              <SearchableSelect
                options={jettyOptions}
                value={jettyId}
                onValueChange={setJettyId}
                searchPlaceholder={t("common.search")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("admin.operators.boatOwner")}</Label>
              <SearchableSelect
                options={ownerOptions}
                value={ownerId}
                onValueChange={setOwnerId}
                searchPlaceholder={t("common.search")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("admin.people.opLicence")}</Label>
              <Input
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                placeholder={t("admin.people.opLicencePh")}
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.people.opLicenceHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={pending || !active || !displayName.trim() || !jettyId}
              onClick={() =>
                startTransition(async () => {
                  if (!active) return;
                  try {
                    await actionUpdateHandler({
                      handlerId: active.id,
                      displayName,
                      jettyId,
                      licenseNo,
                      boatOwnerId: ownerId || null,
                    });
                    toast.success(t("admin.operators.updated"));
                    setEditOpen(false);
                    router.refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
