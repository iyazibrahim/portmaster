import { redirect } from "next/navigation";

export default function AdminOperatorsRedirect() {
  redirect("/admin/boats?tab=operators");
}
