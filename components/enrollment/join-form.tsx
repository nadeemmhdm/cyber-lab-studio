"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

export function JoinForm({ token, remaining, instructorName, expiresAt }: { token: string; remaining: number; instructorName: string; expiresAt: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/enrollment/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: String(form.get("username") ?? ""), password: String(form.get("password") ?? "") }),
      });
      const data = await response.json() as { error?: string; user?: { username?: string | null } };
      if (!response.ok) throw new Error(data.error ?? "Account creation failed.");
      setDone(true);
      setTone("success");
      setMessage(`Student account ${data.user?.username ?? ""} created. You can sign in now.`);
      event.currentTarget.reset();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Account creation failed.");
    } finally { setBusy(false); }
  }

  return <div className="auth-card glass">
    <p className="eyebrow">Instructor enrollment</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight">Join CyberLab</h1>
    <p className="mt-3 text-sm leading-6 muted">Invitation from <strong className="text-[var(--foreground)]">{instructorName}</strong>. {remaining} seat{remaining === 1 ? "" : "s"} remaining. Link expires {new Date(expiresAt).toLocaleString()}.</p>
    {!done ? <form className="mt-7 space-y-4" onSubmit={submit}>
      <label className="field-label">Choose username<input name="username" className="field-input" autoComplete="username" minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,30}[A-Za-z0-9]" required /><span className="text-xs muted">3–32 characters: letters, numbers, dot, underscore, hyphen.</span></label>
      <label className="field-label">Choose password<input name="password" type="password" className="field-input" autoComplete="new-password" minLength={10} maxLength={128} required /></label>
      <label className="field-label">Confirm password<input name="confirmPassword" type="password" className="field-input" autoComplete="new-password" minLength={10} maxLength={128} required onInput={(event) => { const input = event.currentTarget; const password = (input.form?.elements.namedItem("password") as HTMLInputElement | null)?.value ?? ""; input.setCustomValidity(input.value === password ? "" : "Passwords do not match."); }} /></label>
      <button className="button-primary w-full" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create student account"}</button>
    </form> : <Link href="/login" className="button-primary mt-6 flex w-full justify-center">Go to sign in</Link>}
    <div className="mt-4"><FeedbackToast message={message} tone={tone} /></div>
  </div>;
}
