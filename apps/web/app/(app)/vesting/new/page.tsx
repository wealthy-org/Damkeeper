import { redirect } from "next/navigation";

// Create-vesting is a modal on the app shell now; keep old links working.
export default function CreateVestingRedirect() {
  redirect("/app?create=vesting");
}
