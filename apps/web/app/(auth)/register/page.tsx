import { redirect } from "next/navigation";

// OAuth-only auth — no separate registration flow needed.
export default function RegisterPage() {
  redirect("/login");
}
