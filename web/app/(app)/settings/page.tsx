import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Settings has been archived; use Help as the single guidance hub.
  redirect("/help#setup-archive");
}
