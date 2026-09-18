"use client";

import { useTransition } from "react";
import { actionCompleteTrip } from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CompleteTripButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await actionCompleteTrip(bookingId);
            toast.success("Trip completed");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        })
      }
    >
      {pending ? "…" : "Complete"}
    </Button>
  );
}
