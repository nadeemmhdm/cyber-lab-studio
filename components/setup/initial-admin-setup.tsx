"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

export function InitialAdminSetup({ eligible, configured, adminExists }: { eligible: boolean; configured: boolean; adminExists: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "info">("info");

  async function claim() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/setup/admin", { method: "POST" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Administrator setup failed.");
      setTone("success");
      setMessage("Administrator role claimed. Reloading your account permissions.");
      router.refresh();
      window.location.assign("/admin");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Administrator setup failed.");
    } finally { setBusy(false); }
  }

  if (adminExists) return <div className="panel p-6"><h2 className="text-xl font-semibold">Initial setup is complete</h2><p className="mt-2 text-sm leading-6 muted">An administrator account already exists. Future role changes must be made from the Admin control center.</p></div>;
  if (!configured) return <div className="panel p-6"><h2 className="text-xl font-semibold">Administrator email is not configured</h2><p className="mt-2 text-sm leading-6 muted">Set <code>INITIAL_ADMIN_EMAIL</code> in the server environment, restart CyberLab, then sign in with that verified Firebase account.</p></div>;

  return <div className="panel p-6"><h2 className="text-xl font-semibold">Claim the first administrator account</h2><p className="mt-2 text-sm leading-6 muted">Only the verified account whose email matches the server-side <code>INITIAL_ADMIN_EMAIL</code> value can claim this role. The claim is disabled permanently after the first administrator exists.</p><button className="button-primary mt-5" disabled={busy || !eligible} onClick={claim}>{busy ? "Configuring…" : eligible ? "Claim administrator role" : "This account is not eligible"}</button><FeedbackToast message={message} tone={tone} /></div>;
}
