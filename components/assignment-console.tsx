"use client";

import { useMemo, useState } from "react";
import type { RoleType } from "@prisma/client";

type UserRow = { id: string; email: string; displayName: string; roles: { role: { key: RoleType } }[] };
type AssignmentRow = { instructorId: string; studentId: string; instructor: { displayName: string; email: string }; student: { displayName: string; email: string } };

async function patch(body: unknown) {
  const response = await fetch("/api/admin/manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Assignment action failed.");
}

export function AssignmentConsole({ users, assignments }: { users: UserRow[]; assignments: AssignmentRow[] }) {
  const instructors = useMemo(() => users.filter((user) => user.roles.some((entry) => entry.role.key === "INSTRUCTOR")), [users]);
  const students = useMemo(() => users.filter((user) => user.roles.some((entry) => entry.role.key === "STUDENT")), [users]);
  const [instructorId, setInstructorId] = useState(instructors[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(body: unknown) {
    setBusy(true); setMessage("");
    try { await patch(body); setMessage("Assignment updated. Refresh to view current server state."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Assignment action failed."); }
    finally { setBusy(false); }
  }

  return <section className="panel p-6"><p className="eyebrow">Instructor scope</p><h2 className="mt-2 text-2xl font-semibold">Assignments</h2><div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end"><label className="flex-1"><span className="text-sm font-medium">Instructor</span><select className="mt-2 w-full rounded-xl border bg-transparent p-3" value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>{instructors.map((user) => <option key={user.id} value={user.id}>{user.displayName} · {user.email}</option>)}</select></label><label className="flex-1"><span className="text-sm font-medium">Student</span><select className="mt-2 w-full rounded-xl border bg-transparent p-3" value={studentId} onChange={(e) => setStudentId(e.target.value)}>{students.map((user) => <option key={user.id} value={user.id}>{user.displayName} · {user.email}</option>)}</select></label><button className="button-primary" disabled={busy || !instructorId || !studentId} onClick={() => run({ action: "assignment.set", instructorId, studentId })}>Assign student</button></div>
    <div className="mt-6 space-y-2">{assignments.length ? assignments.map((item) => <div className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }} key={`${item.instructorId}:${item.studentId}`}><p><strong>{item.student.displayName}</strong> <span className="muted">→ {item.instructor.displayName}</span></p><button className="button-secondary" disabled={busy} onClick={() => run({ action: "assignment.remove", instructorId: item.instructorId, studentId: item.studentId })}>Remove</button></div>) : <p className="text-sm muted">No instructor assignments yet.</p>}</div><p className="mt-3 text-sm muted" aria-live="polite">{message}</p></section>;
}
