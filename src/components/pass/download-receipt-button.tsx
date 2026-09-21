"use client";

import { Button } from "@/components/ui/button";
import { formatEnumLabel } from "@/lib/utils-app";

export function DownloadReceiptButton({
  reference,
  anglerName,
  jettyName,
  pillarName,
  feeLabel,
  paymentRef,
  validOn,
  status,
}: {
  reference: string;
  anglerName: string;
  jettyName: string;
  pillarName: string;
  feeLabel: string;
  paymentRef: string;
  validOn: string;
  status: string;
}) {
  function download() {
    const statusLabel = formatEnumLabel(status);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt ${reference}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
h1{font-size:18px;margin:0 0 8px}
.muted{color:#64748b;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:16px}
td{padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
td:first-child{color:#64748b;width:40%}
@media print{button{display:none}}
</style></head><body>
<h1>TiangPass — Fishing Pass Receipt</h1>
<p class="muted">Association fee · non-refundable</p>
<table>
<tr><td>Pass reference</td><td><strong>${reference}</strong></td></tr>
<tr><td>Angler</td><td>${anglerName}</td></tr>
<tr><td>Date</td><td>${validOn}</td></tr>
<tr><td>Jetty</td><td>${jettyName}</td></tr>
<tr><td>Pillar</td><td>${pillarName}</td></tr>
<tr><td>Fee</td><td>${feeLabel}</td></tr>
<tr><td>Payment</td><td>${paymentRef}</td></tr>
<tr><td>Status</td><td>${statusLabel}</td></tr>
</table>
<script>window.onload=()=>window.print()</script>
</body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer,width=640,height=720");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  return (
    <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={download}>
      Download / print receipt
    </Button>
  );
}
