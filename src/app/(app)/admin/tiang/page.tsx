import { redirect } from "next/navigation";

export default function AdminTiangRedirect() {
  redirect("/admin/locations");
}
