import { redirect } from "next/navigation";

export default function AdminJettiesRedirect() {
  redirect("/admin/locations?tab=jetties");
}
