"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

export function InitialAdminSetup({ configured, adminExists, emailRestricted }: { configured: boolean; adminExists: boolean; emailRestricted: boolean }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "info">("info");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (password !== confirm) { setTone("error"); setMessage("Passwords do not match."); setBusy(false); return; }
    try {
      const response = await fetch("/api/setup/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: String(form.get("setupToken") ?? ""), email: String(form.get("email") ?? ""), displayName: String(form.get("displayName") ?? ""), password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Administrator setup failed.");
      setDone(true); setTone("success"); setMessage("Administrator account created. INITIAL_ADMIN_SETUP_TOKEN is no longer needed after you confirm sign-in.");
      event.currentTarget.reset();
    } catch (error) { setTone("error"); setMessage(error instanceof Error ? error.message : "Administrator setup failed."); }
    finally { setBusy(false); }
  }

  if (adminExists || done) return <div className="panel p-6"><h2 className="text-xl font-semibold">Initial setup is complete</h2><p className="mt-2 text-sm leading-6 muted">The first administrator account exists. This bootstrap route is now disabled by the server-side admin-exists check.</p><Link href="/login" className="button-primary mt-5 inline-flex">Sign in as administrator</Link><div className="mt-4"><FeedbackToast message={message} tone={tone} /></div></div>;
  if (!configured) return <div className="panel p-6"><h2 className="text-xl font-semibold">Setup token is not configured</h2><p className="mt-2 text-sm leading-6 muted">Set <code>INITIAL_ADMIN_SETUP_TOKEN</code> to a random value of at least 32 characters in <code>.env</code>, restart CyberLab, then return to this page.</p></div>;

  return <div className="panel p-6"><h2 className="text-xl font-semibold">Create the first administrator</h2><p className="mt-2 text-sm leading-6 muted">This form works only while no administrator exists. {emailRestricted ? "The email must also match INITIAL_ADMIN_EMAIL." : "You may optionally restrict the allowed address with INITIAL_ADMIN_EMAIL."}</p><form className="mt-5 grid gap-4" onSubmit={submit}><label className="field-label">Setup token<input className="field-input" name="setupToken" type="password" minLength={32} maxLength={512} autoComplete="off" required /></label><label className="field-label">Administrator name<input className="field-input" name="displayName" minLength={2} maxLength={120} required /></label><label className="field-label">Administrator email<input className="field-input" name="email" type="email" maxLength={254} autoComplete="email" required /></label><label className="field-label">Administrator password<input className="field-input" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><label className="field-label">Confirm password<input className="field-input" name="confirmPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><button className="button-primary" type="submit" disabled={busy}>{busy ? "Creating administrator…" : "Create administrator"}</button></form><div className="mt-4"><FeedbackToast message={message} tone={tone} /></div></div>;
}
