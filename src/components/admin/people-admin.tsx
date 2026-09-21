"use client";

import { useMemo, useState, useTransition } from "react";
import {
  actionCreateUser,
  actionResetUserPassword,
  actionSetAccountStatus,
  actionUpdateUserRole,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  PaginationBar,
  useClientPagination,
} from "@/hooks/use-client-pagination";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import type { AccountStatus, UserRole } from "@/db/schema";
import { roleLabel } from "@/lib/utils-app";

export type PersonRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  accountStatus: AccountStatus;
  handlerName: string | null;
  handlerJettyId: string | null;
  handlerJettyName: string | null;
};

type JettyOption = { id: string; name: string };

const ROLE_OPTIONS = [
  { value: "USER", label: "Angler" },
  { value: "HANDLER", label: "Operator" },
  { value: "ADMIN", label: "Admin" },
  { value: "LLM_VIEWER", label: "LLM Viewer" },
];

const emptyForm = (jettyId: string) => ({
  name: "",
  email: "",
  password: "",
  role: "USER" as UserRole,
  phone: "",
  handlerDisplayName: "",
  jettyId,
});

export function PeopleAdmin({
  people,
  jetties,
}: {
  people: PersonRow[];
  jetties: JettyOption[];
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(jetties[0]?.id ?? ""));

  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [active, setActive] = useState<PersonRow | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("USER");
  const [editJettyId, setEditJettyId] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [blockStatus, setBlockStatus] =
    useState<AccountStatus>("SUSPENDED");
  const [blockReason, setBlockReason] = useState("");

  const jettyOptions = useMemo(
    () => jetties.map((j) => ({ value: j.id, label: j.name })),
    [jetties],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        (p.handlerName ?? "").toLowerCase().includes(q),
    );
  }, [people, query]);

  const pager = useClientPagination(filtered, 10);

  function openCreate() {
    setForm(emptyForm(jetties[0]?.id ?? ""));
    setCreateOpen(true);
  }

  function openEdit(p: PersonRow) {
    setActive(p);
    setEditRole(p.role);
    setEditJettyId(p.handlerJettyId ?? jetties[0]?.id ?? "");
    setEditDisplayName(p.handlerName ?? p.name);
    setEditOpen(true);
  }

  function openReset(p: PersonRow) {
    setActive(p);
    setNewPassword("");
    setResetOpen(true);
  }

  function openBlock(p: PersonRow) {
    setActive(p);
    setBlockStatus(
      p.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
    );
    setBlockReason("");
    setBlockOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 sm:max-w-sm sm:flex-1">
          <Label>Search people</Label>
          <Input
            placeholder="Name, email, or role"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              pager.resetPage();
            }}
          />
        </div>
        <Button onClick={openCreate}>Create user</Button>
      </div>

      <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Handler / Jetty</TableHead>
              <TableHead className="w-[14rem]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pager.pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No people match.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.role === "ADMIN"
                          ? "default"
                          : p.role === "HANDLER"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {roleLabel(p.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.accountStatus} />
                  </TableCell>
                  <TableCell>{p.phone ?? "—"}</TableCell>
                  <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                    {p.handlerName
                      ? `${p.handlerName}${p.handlerJettyName ? ` · ${p.handlerJettyName}` : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(p)}
                      >
                        Role
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReset(p)}
                      >
                        Reset pw
                      </Button>
                      {p.role === "USER" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openBlock(p)}
                        >
                          Status
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        canPrev={pager.canPrev}
        canNext={pager.canNext}
        onPrev={pager.goPrev}
        onNext={pager.goNext}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>
              Create anglers, boatmen, or admins. Boatmen need a jetty
              assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Full name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="user@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="Min 8 characters"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <SearchableSelect
                options={ROLE_OPTIONS}
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as UserRole }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone (optional)</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            {form.role === "HANDLER" ? (
              <>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Handler display name</Label>
                  <Input
                    value={form.handlerDisplayName}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        handlerDisplayName: e.target.value,
                      }))
                    }
                    placeholder="Ops display name"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Jetty</Label>
                  <SearchableSelect
                    options={jettyOptions}
                    value={form.jettyId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, jettyId: v }))
                    }
                    searchPlaceholder="Search jetty…"
                  />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                pending ||
                !form.name.trim() ||
                !form.email.trim() ||
                !form.password
              }
              onClick={() =>
                startTransition(async () => {
                  try {
                    await actionCreateUser(form);
                    toast.success("User created");
                    setCreateOpen(false);
                    setForm(emptyForm(jetties[0]?.id ?? ""));
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update role — {active?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <SearchableSelect
                options={ROLE_OPTIONS}
                value={editRole}
                onValueChange={(v) => setEditRole(v as UserRole)}
              />
            </div>
            {editRole === "HANDLER" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Display name</Label>
                  <Input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Jetty</Label>
                  <SearchableSelect
                    options={jettyOptions}
                    value={editJettyId}
                    onValueChange={setEditJettyId}
                    searchPlaceholder="Search jetty…"
                  />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !active}
              onClick={() =>
                startTransition(async () => {
                  if (!active) return;
                  try {
                    await actionUpdateUserRole({
                      userId: active.id,
                      role: editRole,
                      jettyId: editJettyId,
                      handlerDisplayName: editDisplayName,
                    });
                    toast.success("Role updated");
                    setEditOpen(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password — {active?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !active || newPassword.length < 8}
              onClick={() =>
                startTransition(async () => {
                  if (!active) return;
                  try {
                    await actionResetUserPassword({
                      userId: active.id,
                      password: newPassword,
                    });
                    toast.success("Password reset");
                    setResetOpen(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account status — {active?.name}</DialogTitle>
            <DialogDescription>
              Suspended or blacklisted anglers cannot buy a pass. Blacklisted
              cannot log in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <SearchableSelect
                options={[
                  { value: "ACTIVE", label: "ACTIVE (reactivate)" },
                  { value: "SUSPENDED", label: "SUSPENDED" },
                  { value: "BLACKLISTED", label: "BLACKLISTED" },
                ]}
                value={blockStatus}
                onValueChange={(v) => setBlockStatus(v as AccountStatus)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Required"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !active || !blockReason.trim()}
              onClick={() =>
                startTransition(async () => {
                  if (!active) return;
                  try {
                    await actionSetAccountStatus({
                      userId: active.id,
                      status: blockStatus,
                      reason: blockReason,
                    });
                    toast.success("Account status updated");
                    setBlockOpen(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
