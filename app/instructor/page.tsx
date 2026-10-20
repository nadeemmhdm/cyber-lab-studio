import type { Metadata } from "next";
import { RoleType } from "@prisma/client";
import { CheckCircle2, CircleDashed, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listInstructorStudents } from "@/lib/management/service";

export const metadata: Metadata = { title: "Instructor Dashboard" };

export default async function InstructorPage() {
  const { user } = await requireRole([RoleType.INSTRUCTOR]);
  const students = await listInstructorStudents(user.id);
  const completed = students.reduce((total, student) => total + student.completedLabs, 0);
  const inProgress = students.reduce((total, student) => total + student.inProgressLabs, 0);
  return <section className="shell py-10 sm:py-14"><div><p className="eyebrow">Instructor dashboard</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Assigned learner progress</h1><p className="mt-3 muted">Only students explicitly assigned to your instructor account are visible here.</p></div>
    <div className="stat-grid mt-8"><Stat icon={Users} label="Assigned students" value={students.length} /><Stat icon={CheckCircle2} label="Verified completions" value={completed} /><Stat icon={CircleDashed} label="Labs in progress" value={inProgress} /></div>
    <div className="mt-8 space-y-4">{students.length ? students.map((student) => <article className="panel p-6" key={student.id}><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-xl font-semibold">{student.displayName}</h2><p className="text-sm muted">{student.email}</p></div><div className="flex gap-2"><span className="status-pill">{student.completedLabs} complete</span><span className="status-pill">{student.inProgressLabs} active</span></div></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{student.progress.slice(0, 9).map((entry) => <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} key={entry.id}><p className="text-xs muted">Lab {String(entry.lab.number).padStart(2,"0")}</p><p className="font-medium">{entry.lab.title}</p><p className="mt-1 text-sm muted">{entry.status.replaceAll("_", " ")} · {entry.completionPct}%</p></div>)}</div></article>) : <div className="panel p-8 text-center"><Users className="mx-auto" /><h2 className="mt-3 text-xl font-semibold">No assigned students</h2><p className="mt-2 muted">An administrator can assign students to this instructor account.</p></div>}</div>
  </section>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) { return <div className="stat-card"><span className="stat-icon"><Icon size={20} /></span><div><p className="text-sm muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></div>; }
