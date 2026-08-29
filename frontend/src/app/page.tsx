import { redirect } from "next/navigation";

/**
 * Root page — redirects immediately to the demo project view.
 * All Vertical Slice 1 functionality lives at /projects/MPL-2026-1042.
 */
export default function Home() {
  redirect("/projects/MPL-2026-1042");
}
