import { redirect } from "next/navigation";

/**
 * Root page — redirects to the unified AI portfolio command dashboard.
 */
export default function Home() {
  redirect("/dashboard");
}
