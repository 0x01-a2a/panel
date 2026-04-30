import { redirect } from "next/navigation";

export default function EarnRedirect() {
  redirect("/dashboard/jobs");
}
