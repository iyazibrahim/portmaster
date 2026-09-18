"use client";

import { useState, useTransition } from "react";
import { actionScanToken } from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex max-w-lg flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Validate boarding token</CardTitle>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token">Boarding token / QR payload</Label>
              <Input
                id="token"
                className="font-mono text-sm"
                placeholder="Paste opaque token from fisher QR"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={pending}>
              {pending ? "Validating…" : "Scan / validate"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Scan rejected</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Alert className="animate-scan-flash border-primary">
          <AlertTitle>
            {result.action === "CHECK_IN"
              ? "Check-in recorded"
              : "Check-out recorded"}
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
