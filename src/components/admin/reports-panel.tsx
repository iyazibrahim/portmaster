"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  actionGenerateReport,
  actionPreviewReport,
  type ReportSummary,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  PaginationBar,
  useClientPagination,
} from "@/hooks/use-client-pagination";
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
  const [pending, startTransition] = useTransition();

  const reportJettyId = jettyId === "all" ? undefined : jettyId;

  const jettyOptions = useMemo(
    () => [
      { value: "all", label: "All jetties" },
      ...jetties.map((j) => ({ value: j.id, label: j.name })),
    ],
    [jetties],
  );

  const historyPager = useClientPagination(history, 10);

  const previewRows = useMemo(() => {
    if (!preview) return [];
    return [
      { metric: "Bookings", value: String(preview.summary.bookingsCount) },
      {
        metric: "Revenue (mock)",
        value: formatMYR(preview.summary.revenueCents),
      },
      {
        metric: "Active anglers",
        value: String(preview.summary.activeAnglers),
      },
      { metric: "Check-ins", value: String(preview.summary.checkIns) },
      ...preview.summary.topLocations.map((l, i) => ({
        metric: `Top location #${i + 1}`,
        value: `${l.name} (${l.count})`,
      })),
    ];
  }, [preview]);

  function downloadCsv(filename: string, csv: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Period</Label>
              <div className="flex w-fit gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={type === "WEEKLY" ? "default" : "outline"}
                  onClick={() => setType("WEEKLY")}
                >
                  Weekly
                </Button>
                <Button
                  type="button"
                  size="sm"
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
                className="max-w-xs"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Jetty</Label>
              <SearchableSelect
                options={jettyOptions}
                value={jettyId}
                onValueChange={setJettyId}
                className="max-w-md"
                searchPlaceholder="Search jetty…"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button
            variant="outline"
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
            Preview
          </Button>
          <Button
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
              onClick={() =>
                downloadCsv(
                  `portmaster-${type.toLowerCase()}-${preview.periodStart}.csv`,
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
                {previewRows.map((r) => (
                  <TableRow key={r.metric}>
                    <TableCell className="pl-4">{r.metric}</TableCell>
                    <TableCell>{r.value}</TableCell>
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
          <>
            <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="w-[6rem]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyPager.pageItems.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{h.type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(h.generatedAt).toLocaleString("en-MY")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
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
            </div>
            <PaginationBar
              page={historyPager.page}
              pageCount={historyPager.pageCount}
              total={historyPager.total}
              canPrev={historyPager.canPrev}
              canNext={historyPager.canNext}
              onPrev={historyPager.goPrev}
              onNext={historyPager.goNext}
            />
          </>
        )}
      </div>
    </div>
  );
}
