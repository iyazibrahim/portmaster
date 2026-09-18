"use client";

import { useState, useTransition } from "react";
import { actionCreateAdminUser } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function CreateAdminForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="space-y-3 border-b border-border pb-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          Add admin / authority
        </h2>
        <p className="text-sm text-muted-foreground">
          Create another Admin account (e.g. staff who apply LLM open/close
          guidance). Same Admin role — no separate LLM login.
        </p>
      </div>
      <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="admin-name">Name</Label>
          <Input
            id="admin-name"
            className="min-h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Authority operator"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            className="min-h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ops@example.com"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            className="min-h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
        </div>
      </div>
      <Button
        className="min-h-11"
        disabled={pending || !name.trim() || !email.trim() || !password}
        onClick={() =>
          startTransition(async () => {
            try {
              await actionCreateAdminUser({ name, email, password });
              toast.success("Admin account created");
              setName("");
              setEmail("");
              setPassword("");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          })
        }
      >
        {pending ? "Creating…" : "Create admin"}
      </Button>
    </section>
  );
}
