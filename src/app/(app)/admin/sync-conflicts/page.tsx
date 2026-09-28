import { redirect } from "next/navigation";

export default function AdminSyncConflictsRedirect() {
  redirect("/admin/alerts?tab=sync");
}
