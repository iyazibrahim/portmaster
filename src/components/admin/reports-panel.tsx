"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  actionGenerateReport,
  actionPreviewReport,
  type ReportSummary,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  AdminDataTable,
  ADMIN_CONTROL,
} from "@/components/admin/admin-data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatMYR } from "@/lib/utils-app";
import { toast } from "sonner";

type HistoryRow = {
  id: string;
  type: "WEEKLY" | "MONTHLY";
  title: string;
  periodStart: string;
  periodEnd: string;
  summaryJson: string;
  csvContent: string;
  generatedAt: string;
};

type JettyOption = { id: string; name: string };

export function ReportsPanel({
  history,
  jetties,
}: {
  history: HistoryRow[];
  jetties: JettyOption[];
}) {
  const [type, setType] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [anchorDate, setAnchorDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [jettyId, setJettyId] = useState("all");
  const [preview, setPreview] = useState<{
    periodStart: string;
    periodEnd: string;
    summary: ReportSummary;
    csv: string;
  } | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const reportJettyId = jettyId === "all" ? undefined : jettyId;

  const jettyOptions = useMemo(
    () => [
      { value: "all", label: "All jetties" },
      ...jetties.map((j) => ({ value: j.id, label: j.name })),
    ],
    [jetties],
  );

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.type.toLowerCase().includes(q) ||
        h.periodStart.includes(q) ||
        h.periodEnd.includes(q),
    );
  }, [history, historyQuery]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await actionPreviewReport({
          type,
          anchorDate,
          jettyId: reportJettyId,
        });
        if (!cancelled) setPreview(result);
      } catch {
        /* keep prior preview on transient errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, anchorDate, reportJettyId]);

  function downloadCsv(filename: string, csv: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = preview
    ? [
        { label: "Passes sold", value: String(preview.summary.passesCount) },
        {
          label: "Revenue",
          value: formatMYR(preview.summary.revenueCents),
        },
        { label: "Check-ins", value: String(preview.summary.checkIns) },
        {
          label: "Overdue",
          value: String(preview.summary.overdueCount ?? 0),
        },
      ]
    : [
        { label: "Passes sold", value: "—" },
        { label: "Revenue", value: "—" },
        { label: "Check-ins", value: "—" },
        { label: "Overdue", value: "—" },
      ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-foreground/10"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Period</Label>
              <div className="flex min-h-11 gap-2">
                <Button
                  type="button"
                  className="min-h-11 flex-1"
                  variant={type === "WEEKLY" ? "default" : "outline"}
                  onClick={() => setType("WEEKLY")}
                >
                  Weekly
                </Button>
                <Button
                  type="button"
                  className="min-h-11 flex-1"
                  variant={type === "MONTHLY" ? "default" : "outline"}
                  onClick={() => setType("MONTHLY")}
                >
                  Monthly
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="anchor">Anchor date</Label>
              <Input
                id="anchor"
                type="date"
                className={ADMIN_CONTROL}
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <Label>Jetty</Label>
              <SearchableSelect
                options={jettyOptions}
                value={jettyId}
                onValueChange={setJettyId}
                searchPlaceholder="Search jetty…"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await actionPreviewReport({
                    type,
                    anchorDate,
                    jettyId: reportJettyId,
                  });
                  setPreview(result);
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Preview failed",
                  );
                }
              })
            }
          >
            Refresh preview
          </Button>
          <Button
            className="min-h-11"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await actionGenerateReport({
                    type,
                    anchorDate,
                    jettyId: reportJettyId,
                  });
                  toast.success(`Saved ${result.title}`);
                  const fresh = await actionPreviewReport({
                    type,
                    anchorDate,
                    jettyId: reportJettyId,
                  });
                  setPreview(fresh);
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Generate failed",
                  );
                }
              })
            }
          >
            Generate & save
          </Button>
          {preview ? (
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() =>
                downloadCsv(
                  `tiangpass-${type.toLowerCase()}-${preview.periodStart}.csv`,
                  preview.csv,
                )
              }
            >
              Download CSV
            </Button>
          ) : null}
        </CardFooter>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Preview · {preview.periodStart} → {preview.periodEnd}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Metric</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="pl-4">Passes sold</TableCell>
                  <TableCell>{preview.summary.passesCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Revenue</TableCell>
                  <TableCell>
                    {formatMYR(preview.summary.revenueCents)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Active anglers</TableCell>
                  <TableCell>{preview.summary.activeAnglers}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Check-ins</TableCell>
                  <TableCell>{preview.summary.checkIns}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Overdue</TableCell>
                  <TableCell>{preview.summary.overdueCount ?? 0}</TableCell>
                </TableRow>
                {preview.summary.topLocations.map((l, i) => (
                  <TableRow key={l.name}>
                    <TableCell className="pl-4">
                      Top pillar #{i + 1}
                    </TableCell>
                    <TableCell>
                      {l.name} ({l.count})
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved reports yet. Generate one to start the archive.
          </p>
        ) : (
          <AdminDataTable
            items={filteredHistory}
            search={historyQuery}
            onSearchChange={setHistoryQuery}
            searchPlaceholder="Search history…"
            emptyMessage="No reports match."
          >
            {(pageItems) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3">Title</TableHead>
                    <TableHead className="px-3">Type</TableHead>
                    <TableHead className="px-3">Generated</TableHead>
                    <TableHead className="px-3 w-[6rem]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="px-3 py-2 font-medium">
                        {h.title}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <StatusBadge
                          status={h.type}
                          label={h.type === "WEEKLY" ? "Weekly" : "Monthly"}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {new Date(h.generatedAt).toLocaleString("en-MY")}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() =>
                            downloadCsv(
                              `${h.type.toLowerCase()}-${h.periodStart}.csv`,
                              h.csvContent,
                            )
                          }
                        >
                          CSV
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AdminDataTable>
        )}
      </div>
    </div>
  );
}
