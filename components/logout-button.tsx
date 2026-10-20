"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" className="nav-action" onClick={logout} disabled={busy}><LogOut size={16} aria-hidden="true" /><span className="hidden lg:inline">{busy ? "Signing out…" : "Sign out"}</span></button>;
}
