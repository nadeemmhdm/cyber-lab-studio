"use client";

import { useState } from "react";
import type { LearningMode, RoleType } from "@prisma/client";

type UserRow = { id: string; email: string; displayName: string; suspendedAt: string | Date | null; roles: { role: { key: RoleType } }[] };
type LabRow = { id: string; number: number; slug: string; title: string; enabled: boolean; versions: { version: number; published: boolean }[] };
type Controls = { maintenanceMode: boolean; allowedLearningModes: LearningMode[]; showHints: boolean; showSolutions: boolean; maxLabStartsPerDay: number };

async function patch(body: unknown) {
  const response = await fetch("/api/admin/manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Management action failed.");
  return data;
}

export function AdminConsole({ users, labs, controls }: { users: UserRow[]; labs: LabRow[]; controls: Controls }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [localControls, setLocalControls] = useState(controls);

  async function run(body: unknown) {
    setBusy(true); setMessage("");
    try { await patch(body); setMessage("Saved. Refresh to view the latest server state."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Action failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-8">
    <section className="panel p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Platform controls</p><h2 className="mt-2 text-2xl font-semibold">Learning and maintenance policy</h2></div><button className="button-primary" disabled={busy} onClick={() => run({ action: "controls.update", ...localControls })}>Save controls</button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><span className="font-medium">Maintenance mode</span><input className="ml-3" type="checkbox" checked={localControls.maintenanceMode} onChange={(e) => setLocalControls({ ...localControls, maintenanceMode: e.target.checked })} /></label>
        <label className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><span className="font-medium">Show hints</span><input className="ml-3" type="checkbox" checked={localControls.showHints} onChange={(e) => setLocalControls({ ...localControls, showHints: e.target.checked })} /></label>
        <label className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><span className="font-medium">Show solutions</span><input className="ml-3" type="checkbox" checked={localControls.showSolutions} onChange={(e) => setLocalControls({ ...localControls, showSolutions: e.target.checked })} /></label>
        <label className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><span className="block font-medium">Daily lab-start quota</span><input className="mt-2 w-full rounded-lg border bg-transparent p-2" min={1} max={500} type="number" value={localControls.maxLabStartsPerDay} onChange={(e) => setLocalControls({ ...localControls, maxLabStartsPerDay: Number(e.target.value) })} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">{(["GUIDED", "PRACTICE", "CHALLENGE"] as LearningMode[]).map((mode) => <label key={mode} className="status-pill"><input type="checkbox" checked={localControls.allowedLearningModes.includes(mode)} onChange={(e) => setLocalControls({ ...localControls, allowedLearningModes: e.target.checked ? [...localControls.allowedLearningModes, mode] : localControls.allowedLearningModes.filter((item) => item !== mode) })} /> {mode}</label>)}</div>
    </section>

    <section className="panel p-6"><p className="eyebrow">Users</p><h2 className="mt-2 text-2xl font-semibold">Roles and suspension</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">User</th><th className="p-2">Roles</th><th className="p-2">State</th><th className="p-2">Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-2"><strong>{user.displayName}</strong><div className="muted">{user.email}</div></td><td className="p-2">{user.roles.map((entry) => entry.role.key).join(", ")}</td><td className="p-2">{user.suspendedAt ? "Suspended" : "Active"}</td><td className="p-2"><div className="flex flex-wrap gap-2"><button className="button-secondary" disabled={busy} onClick={() => run({ action: "user.suspend", userId: user.id, suspended: !user.suspendedAt })}>{user.suspendedAt ? "Restore" : "Suspend"}</button><button className="button-secondary" disabled={busy} onClick={() => run({ action: "user.roles", userId: user.id, roles: ["STUDENT"] })}>Student</button><button className="button-secondary" disabled={busy} onClick={() => run({ action: "user.roles", userId: user.id, roles: ["INSTRUCTOR"] })}>Instructor</button></div></td></tr>)}</tbody></table></div></section>

    <section className="panel p-6"><p className="eyebrow">Labs</p><h2 className="mt-2 text-2xl font-semibold">Availability and versions</h2><div className="mt-5 grid gap-3 lg:grid-cols-2">{labs.map((lab) => <article key={lab.id} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs muted">Lab {String(lab.number).padStart(2,"0")}</p><h3 className="font-semibold">{lab.title}</h3><p className="mt-1 text-xs muted">{lab.versions.map((version) => `v${version.version}${version.published ? " published" : ""}`).join(" · ")}</p></div><button className="button-secondary" disabled={busy} onClick={() => run({ action: "lab.update", slug: lab.slug, enabled: !lab.enabled })}>{lab.enabled ? "Disable" : "Enable"}</button></div><div className="mt-3 flex gap-2"><button className="button-secondary" disabled={busy} onClick={() => run({ action: "version.create", slug: lab.slug })}>Clone new version</button>{lab.versions.find((v) => !v.published) ? <button className="button-secondary" disabled={busy} onClick={() => run({ action: "version.publish", slug: lab.slug, version: lab.versions.find((v) => !v.published)!.version })}>Publish latest draft</button> : null}</div></article>)}</div></section>
    <p aria-live="polite" className="text-sm muted">{message}</p>
  </div>;
}
