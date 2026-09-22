"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReceiptPrintTrigger() {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button type="button" className="min-h-11" onClick={() => window.print()}>
        Print / Save as PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => window.close()}
      >
        Close
      </Button>
    </div>
  );
}
