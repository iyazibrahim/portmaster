"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DownloadReceiptButton({ passId }: { passId: string }) {
  return (
    <Link
      href={`/pass/${passId}/receipt?print=1`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "inline-flex min-h-11 w-full sm:w-auto",
      )}
    >
      Download / print receipt
    </Link>
  );
}
