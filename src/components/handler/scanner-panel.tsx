"use client";

import { useState, useTransition } from "react";
import { actionScanToken } from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export function ScannerPanel() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<{
    action: string;
    bookingId: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await actionScanToken(token);
        setResult(res);
        toast.success(
          res.action === "CHECK_IN" ? "Checked in" : "Checked out",
        );
        setToken("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scan failed");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">Boarding token / QR payload</Label>
          <Input
            id="token"
            className="min-h-12 font-mono text-sm"
            placeholder="Paste opaque token from fisher QR"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="min-h-12 w-full" disabled={pending}>
          {pending ? "Validating…" : "Scan / validate"}
        </Button>
      </form>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Scan rejected</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Alert className="animate-scan-flash border-primary">
          <AlertTitle>
            {result.action === "CHECK_IN" ? "Check-in recorded" : "Check-out recorded"}
          </AlertTitle>
          <AlertDescription>
            Booking {result.bookingId.slice(0, 16)}… → {result.status}
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="text-xs text-muted-foreground">
        First scan on a confirmed booking checks in (marks token used). Second
        scan (or Complete on Today) checks out.
      </p>
    </div>
  );
}
