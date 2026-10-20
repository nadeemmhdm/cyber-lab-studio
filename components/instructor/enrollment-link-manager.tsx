"use client";

import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

type InviteRow = {
  id: string;
  label: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  revokedAt: string | null;
  registrations: { student: { id: string; username: string | null; displayName: string }; createdAt: string }[];
};

export function EnrollmentLinkManager({ initialInvites }: { initialInvites: InviteRow[] }) {
  const [invites, setInvites] = useState(initialInvites);
  const [createdUrl, setCreatedUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  async function refresh() {
    const response = await fetch("/api/instructor/enrollment-links", { cache: "no-store" });
    const data = await response.json() as { invites?: InviteRow[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not refresh enrollment links.");
    setInvites(data.invites ?? []);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/instructor/enrollment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxUses: Number(form.get("maxUses") ?? 1),
          expiresHours: Number(form.get("expiresHours") ?? 72),
          label: String(form.get("label") ?? ""),
        }),
      });
      const data = await response.json() as { invite?: InviteRow & { url?: string }; error?: string };
      if (!response.ok || !data.invite?.url) throw new Error(data.error ?? "Could not create enrollment link.");
      setCreatedUrl(data.invite.url);
      setTone("success");
      setMessage("Enrollment link created. Copy it now; the raw token is not stored and cannot be shown again.");
      event.currentTarget.reset();
      await refresh();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not create enrollment link.");
    } finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/instructor/enrollment-links/${id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not revoke enrollment link.");
      setTone("success");
      setMessage("Enrollment link revoked.");
      await refresh();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not revoke enrollment link.");
    } finally { setBusy(false); }
  }

  return <section className="panel p-6">
    <p className="eyebrow">Student onboarding</p>
    <h2 className="mt-2 text-2xl font-semibold">Generate enrollment link</h2>
    <p className="mt-2 text-sm leading-6 muted">Set the number of student seats once. Learners open one link and choose their own username and password; every account is automatically assigned to you.</p>
    <form className="mt-5 grid gap-3 sm:grid-cols-3" onSubmit={create}>
      <label className="field-label">Label<input className="field-input" name="label" placeholder="Batch A" maxLength={120} /></label>
      <label className="field-label">Student count<input className="field-input" name="maxUses" type="number" min={1} max={500} defaultValue={30} required /></label>
      <label className="field-label">Expires in hours<input className="field-input" name="expiresHours" type="number" min={1} max={720} defaultValue={72} required /></label>
      <button className="button-primary sm:col-span-3" type="submit" disabled={busy}>{busy ? "Creating…" : "Generate enrollment link"}</button>
    </form>
    {createdUrl ? <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--accent-soft)" }}><p className="text-xs font-semibold uppercase tracking-wider muted">New link — shown once</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input className="field-input flex-1" readOnly value={createdUrl} /><button className="button-secondary" type="button" onClick={() => navigator.clipboard.writeText(createdUrl)}>Copy link</button></div></div> : null}
    <div className="mt-4"><FeedbackToast message={message} tone={tone} /></div>
    <div className="mt-6 space-y-3">{invites.map((invite) => { const active = !invite.revokedAt && new Date(invite.expiresAt) > new Date() && invite.usedCount < invite.maxUses; return <details key={invite.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><summary className="cursor-pointer font-semibold">{invite.label || "Enrollment batch"} · {invite.usedCount}/{invite.maxUses} joined · {active ? "Active" : "Closed"}</summary><div className="mt-3 text-sm muted"><p>Expires: {new Date(invite.expiresAt).toLocaleString()}</p>{invite.registrations.length ? <ul className="mt-3 space-y-1">{invite.registrations.map((registration) => <li key={registration.student.id}>{registration.student.username ?? registration.student.displayName}</li>)}</ul> : <p className="mt-2">No students have joined yet.</p>}{active ? <button className="button-secondary mt-3" type="button" disabled={busy} onClick={() => revoke(invite.id)}>Revoke link</button> : null}</div></details>; })}</div>
  </section>;
}
