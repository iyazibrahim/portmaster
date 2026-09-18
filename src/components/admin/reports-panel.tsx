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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [anchorDate, setAnchorDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [jettyId, setJettyId] = useState<string>("all");
  const [preview, setPreview] = useState<{
    periodStart: string;
    periodEnd: string;
    summary: ReportSummary;
    csv: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const reportJettyId = jettyId === "all" ? undefined : jettyId;

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
    <div className="space-y-8">
      <section className="space-y-4 border-b border-border pb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Period type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "WEEKLY" ? "default" : "outline"}
                className="min-h-11 flex-1"
                onClick={() => setType("WEEKLY")}
              >
                Weekly
              </Button>
              <Button
                type="button"
                variant={type === "MONTHLY" ? "default" : "outline"}
                className="min-h-11 flex-1"
                onClick={() => setType("MONTHLY")}
              >
                Monthly
              </Button>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="anchor">Anchor date</Label>
            <Input
              id="anchor"
              type="date"
              className="min-h-11"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label>Jetty</Label>
            <Select value={jettyId} onValueChange={(v) => v && setJettyId(v)}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All jetties</SelectItem>
                {jetties.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            className="min-h-11"
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
                  toast.error(e instanceof Error ? e.message : "Preview failed");
                }
              })
            }
          >
            Preview
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
              className="min-h-11"
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
        </div>
      </section>

      {preview ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            Preview · {preview.periodStart} → {preview.periodEnd}
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r) => (
                  <TableRow key={r.metric}>
                    <TableCell>{r.metric}</TableCell>
                    <TableCell>{r.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved reports yet. Generate one to start the archive.
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{h.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(h.generatedAt).toLocaleString("en-MY")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{h.type}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    onClick={() =>
                      downloadCsv(
                        `${h.type.toLowerCase()}-${h.periodStart}.csv`,
                        h.csvContent,
                      )
                    }
                  >
                    CSV
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
