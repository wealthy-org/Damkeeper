import { redirect } from "next/navigation";

// Create-lock is a modal on the app shell now; keep old links working.
export default function CreateLockRedirect() {
  redirect("/app?create=lock");
}
