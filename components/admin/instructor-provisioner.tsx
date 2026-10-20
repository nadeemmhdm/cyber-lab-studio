"use client";

import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

export function InstructorProvisioner() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email") ?? ""), displayName: String(form.get("displayName") ?? ""), password: String(form.get("password") ?? "") }),
      });
      const data = await response.json() as { error?: string; user?: { email: string } };
      if (!response.ok) throw new Error(data.error ?? "Could not create instructor account.");
      setTone("success");
      setMessage(`Instructor ${data.user?.email ?? ""} created. Share the temporary password securely and ask them to enable TOTP 2FA.`);
      event.currentTarget.reset();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not create instructor account.");
    } finally { setBusy(false); }
  }

  return <section className="panel p-6">
    <p className="eyebrow">Instructor accounts</p>
    <h2 className="mt-2 text-2xl font-semibold">Create instructor</h2>
    <p className="mt-2 text-sm leading-6 muted">Instructor accounts are provisioned by administrators. Public instructor registration is disabled.</p>
    <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={submit}>
      <label className="field-label">Display name<input name="displayName" className="field-input" minLength={2} maxLength={120} required /></label>
      <label className="field-label">Email<input name="email" className="field-input" type="email" maxLength={254} required /></label>
      <label className="field-label md:col-span-2">Temporary password<input name="password" className="field-input" type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></label>
      <button className="button-primary md:col-span-2" type="submit" disabled={busy}>{busy ? "Creating…" : "Create instructor account"}</button>
    </form>
    <div className="mt-4"><FeedbackToast message={message} tone={tone} /></div>
  </section>;
}
