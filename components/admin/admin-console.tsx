"use client";

import { useState } from "react";
import type { LearningMode, RoleType } from "@prisma/client";
import { FeedbackToast } from "@/components/ui/feedback-toast";

type UserRow = { id: string; displayName: string; email: string; suspended: boolean; roles: RoleType[] };
type LabRow = { id: string; number: number; title: string; objective: string; enabled: boolean; versions: { id: string; version: number; published: boolean; conceptExplanation: string; scenario: string; hints: { id: string; level: number; content: string }[]; solution: { id: string; summary: string; verification: string; commonMistakes: string; troubleshooting: string } | null }[] };
type Controls = { maintenance: { enabled: boolean; message: string }; quota: { maxActiveEnvironmentsPerUser: number }; learning: { allowedModes: LearningMode[]; showHints: boolean; showSolutions: boolean } };

async function patch(url: string, body: unknown) {
  const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json() as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Update failed.");
  return data;
}

export function AdminConsole({ initialUsers, labs, initialControls }: { initialUsers: UserRow[]; labs: LabRow[]; initialControls: Controls }) {
  const [users, setUsers] = useState(initialUsers);
  const [controls, setControls] = useState(initialControls);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "info">("info");

  async function run(action: () => Promise<void>, success: string) {
    setMessage("");
    try { await action(); setTone("success"); setMessage(success); }
    catch (error) { setTone("error"); setMessage(error instanceof Error ? error.message : "Update failed."); }
  }

  function updateControl<K extends keyof Controls>(group: K, value: Controls[K]) { setControls((current) => ({ ...current, [group]: value })); }

  async function saveControls() {
    await run(async () => {
      await patch("/api/admin/settings", {
        maintenanceEnabled: controls.maintenance.enabled,
        maintenanceMessage: controls.maintenance.message,
        maxActiveEnvironmentsPerUser: controls.quota.maxActiveEnvironmentsPerUser,
        allowedModes: controls.learning.allowedModes,
        showHints: controls.learning.showHints,
        showSolutions: controls.learning.showSolutions,
      });
    }, "Platform controls saved and audited.");
  }

  async function setUserRole(userId: string, role: RoleType) {
    await run(async () => {
      await patch(`/api/admin/users/${userId}`, { roles: [role] });
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, roles: [role] } : user));
    }, "User role updated.");
  }

  async function toggleSuspended(userId: string, suspended: boolean) {
    await run(async () => {
      await patch(`/api/admin/users/${userId}`, { suspended });
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, suspended } : user));
    }, suspended ? "User suspended." : "User restored.");
  }

  async function resetPassword(userId: string) {
    const password = window.prompt("Enter a new temporary password (minimum 10 characters). The user's active Firebase sessions will be revoked.");
    if (!password) return;
    await run(async () => { await patch(`/api/admin/users/${userId}/password`, { password }); }, "Password reset and active refresh tokens revoked.");
  }

  return <div className="space-y-8">
    <section className="panel p-6">
      <p className="eyebrow">Platform controls</p><h2 className="mt-2 text-2xl font-semibold">Maintenance, quotas & learning policy</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">Maintenance message<input className="input" value={controls.maintenance.message} onChange={(event) => updateControl("maintenance", { ...controls.maintenance, message: event.target.value })} /></label>
        <label className="grid gap-2 text-sm">Active environment quota<input className="input" type="number" min={1} max={100} value={controls.quota.maxActiveEnvironmentsPerUser} onChange={(event) => updateControl("quota", { maxActiveEnvironmentsPerUser: Number(event.target.value) })} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <label><input type="checkbox" checked={controls.maintenance.enabled} onChange={(e) => updateControl("maintenance", { ...controls.maintenance, enabled: e.target.checked })} /> Maintenance mode</label>
        <label><input type="checkbox" checked={controls.learning.showHints} onChange={(e) => updateControl("learning", { ...controls.learning, showHints: e.target.checked })} /> Show hints</label>
        <label><input type="checkbox" checked={controls.learning.showSolutions} onChange={(e) => updateControl("learning", { ...controls.learning, showSolutions: e.target.checked })} /> Show solutions</label>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">{(["GUIDED","PRACTICE","CHALLENGE"] as LearningMode[]).map((mode) => <label key={mode}><input type="checkbox" checked={controls.learning.allowedModes.includes(mode)} onChange={(e) => updateControl("learning", { ...controls.learning, allowedModes: e.target.checked ? [...controls.learning.allowedModes, mode] : controls.learning.allowedModes.filter((item) => item !== mode) })} /> {mode}</label>)}</div>
      <button className="button-primary mt-5" onClick={saveControls}>Save platform controls</button>
    </section>

    <section className="panel p-6"><p className="eyebrow">Accounts</p><h2 className="mt-2 text-2xl font-semibold">User, role, suspension & password management</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">User</th><th className="p-2">Role</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-2"><strong>{user.displayName}</strong><div className="muted">{user.email}</div></td><td className="p-2"><select className="input" value={user.roles[0]} onChange={(e) => setUserRole(user.id, e.target.value as RoleType)}>{["STUDENT","INSTRUCTOR","ADMIN"].map((role) => <option key={role}>{role}</option>)}</select></td><td className="p-2">{user.suspended ? "Suspended" : "Active"}</td><td className="p-2"><div className="flex flex-wrap gap-2"><button className="button-secondary" onClick={() => toggleSuspended(user.id, !user.suspended)}>{user.suspended ? "Restore" : "Suspend"}</button><button className="button-secondary" onClick={() => resetPassword(user.id)}>Reset password</button></div></td></tr>)}</tbody></table></div></section>

    <section className="panel p-6"><p className="eyebrow">Curriculum</p><h2 className="mt-2 text-2xl font-semibold">Lab, version, hint & solution management</h2><div className="mt-5 space-y-3">{labs.map((lab) => <LabEditor key={lab.id} lab={lab} onMessage={(text, error) => { setTone(error ? "error" : "success"); setMessage(text); }} />)}</div></section>
    <FeedbackToast message={message} tone={tone} />
  </div>;
}

function LabEditor({ lab, onMessage }: { lab: LabRow; onMessage: (message: string, error?: boolean) => void }) {
  const latest = lab.versions[0];
  const [enabled, setEnabled] = useState(lab.enabled);
  const [title, setTitle] = useState(lab.title);
  const [objective, setObjective] = useState(lab.objective);
  async function save(body: unknown, success: string) { try { await patch(`/api/admin/labs/${lab.id}`, body); onMessage(success); } catch (error) { onMessage(error instanceof Error ? error.message : "Lab update failed.", true); } }
  return <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><summary className="cursor-pointer font-semibold">Lab {String(lab.number).padStart(2,"0")} · {title}</summary><div className="mt-4 grid gap-3"><label className="text-sm">Title<input className="input mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} /></label><label className="text-sm">Objective<textarea className="input mt-1 min-h-24 w-full" value={objective} onChange={(e) => setObjective(e.target.value)} /></label><label className="text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled</label><button className="button-secondary" onClick={() => save({ title, objective, enabled }, "Lab metadata saved.")}>Save lab</button>{latest ? <><VersionEditor labId={lab.id} version={latest} save={save} />{latest.hints.map((hint) => <HintEditor key={hint.id} hint={hint} save={save} />)}{latest.solution ? <SolutionEditor solution={latest.solution} save={save} /> : null}</> : null}</div></details>;
}

function VersionEditor({ version, save }: { labId: string; version: LabRow["versions"][number]; save: (body: unknown, success: string) => Promise<void> }) { const [concept, setConcept] = useState(version.conceptExplanation); const [scenario, setScenario] = useState(version.scenario); const [published, setPublished] = useState(version.published); return <details className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><summary>Version {version.version}</summary><textarea className="input mt-3 min-h-28 w-full" value={concept} onChange={(e) => setConcept(e.target.value)} /><textarea className="input mt-3 min-h-28 w-full" value={scenario} onChange={(e) => setScenario(e.target.value)} /><label className="mt-3 block text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published</label><button className="button-secondary mt-3" onClick={() => save({ version: { id: version.id, conceptExplanation: concept, scenario, published } }, "Version saved.")}>Save version</button></details>; }
function HintEditor({ hint, save }: { hint: { id: string; level: number; content: string }; save: (body: unknown, success: string) => Promise<void> }) { const [content, setContent] = useState(hint.content); return <details className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><summary>Hint level {hint.level}</summary><textarea className="input mt-3 min-h-24 w-full" value={content} onChange={(e) => setContent(e.target.value)} /><button className="button-secondary mt-3" onClick={() => save({ hint: { id: hint.id, content } }, "Hint saved.")}>Save hint</button></details>; }
function SolutionEditor({ solution, save }: { solution: NonNullable<LabRow["versions"][number]["solution"]>; save: (body: unknown, success: string) => Promise<void> }) { const [summary, setSummary] = useState(solution.summary); const [verification, setVerification] = useState(solution.verification); const [mistakes, setMistakes] = useState(solution.commonMistakes); const [troubleshooting, setTroubleshooting] = useState(solution.troubleshooting); return <details className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><summary>Solution</summary>{[["Summary",summary,setSummary],["Verification",verification,setVerification],["Common mistakes",mistakes,setMistakes],["Troubleshooting",troubleshooting,setTroubleshooting]].map(([label,value,setter]) => <label className="mt-3 block text-sm" key={label as string}>{label as string}<textarea className="input mt-1 min-h-24 w-full" value={value as string} onChange={(e) => (setter as (value:string)=>void)(e.target.value)} /></label>)}<button className="button-secondary mt-3" onClick={() => save({ solution: { id: solution.id, summary, verification, commonMistakes: mistakes, troubleshooting } }, "Solution saved.")}>Save solution</button></details>; }
