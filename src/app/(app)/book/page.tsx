import { redirect } from "next/navigation";

/** Legacy seat-map wizard — replaced by same-day Association pass. */
export default function BookRedirectPage() {
  redirect("/pass");
}
