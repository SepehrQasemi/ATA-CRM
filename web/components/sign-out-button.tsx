"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLocale } from "@/components/locale-provider";

export function SignOutButton() {
  const router = useRouter();
  const { tr } = useLocale();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="btn btn-secondary" onClick={handleSignOut} type="button">
      {tr("Logout")}
    </button>
  );
}
