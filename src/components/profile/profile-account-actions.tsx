"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAccountAction,
  updateProfileDetailsAction,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function EditProfileButton({
  initial,
  className,
}: {
  initial: {
    phone: string;
    emergencyContactName: string;
    emergencyContact: string;
    address: string;
  };
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState(initial.phone);
  const [emergencyContactName, setEmergencyContactName] = useState(
    initial.emergencyContactName,
  );
  const [emergencyContact, setEmergencyContact] = useState(
    initial.emergencyContact,
  );
  const [address, setAddress] = useState(initial.address);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateProfileDetailsAction({
        phone,
        emergencyContactName,
        emergencyContact,
        address,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success("Profile updated");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={className ?? "min-h-11"}
          />
        }
      >
        Edit details
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit contact details</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Mobile</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-em-name">Emergency contact name</Label>
            <Input
              id="edit-em-name"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              className="min-h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-em-phone">Emergency contact number</Label>
            <Input
              id="edit-em-phone"
              type="tel"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="min-h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">Residential address</Label>
            <textarea
              id="edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              required
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="min-h-11">
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAccountButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction({ password, confirmText });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Account deleted");
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPassword("");
          setConfirmText("");
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={
              className ??
              "min-h-11 border-destructive/40 text-destructive hover:bg-destructive/10"
            }
          />
        }
      >
        Delete account
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Under PDPA we anonymise your personal data (name, MyKad, photo,
            contacts). Pass and payment history may be retained in anonymised
            form for Association audit. This cannot be undone.
          </p>
          <div className="space-y-2">
            <Label htmlFor="delete-password">Password</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="min-h-11"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="min-h-11"
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
