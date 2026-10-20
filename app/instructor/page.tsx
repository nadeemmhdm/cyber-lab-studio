import type { Metadata } from "next";
import Link from "next/link";
import { RoleType } from "@prisma/client";
import { CheckCircle2, CircleDashed, MessageCircleQuestion, UsersRound } from "lucide-react";
import { AssignmentManager } from "@/components/instructor/assignment-manager";
import { EnrollmentLinkManager } from "@/components/instructor/enrollment-link-manager";
import { requireRole } from "@/lib/auth/rbac";
import { listEnrollmentInvites } from "@/lib/enrollment/service";
import { getInstructorOverview } from "@/lib/management/service";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Instructor" };

export default async function InstructorPage() {
  const session = await requireRole([RoleType.INSTRUCTOR, RoleType.ADMIN]);
  const isAdmin = session.user.roles.includes(RoleType.ADMIN);
  const students = await getInstructorOverview(session.user.id, isAdmin);
  const [allStudents, assignedIds, invites, openDoubts] = await Promise.all([
    prisma.user.findMany({ where: { roles: { some: { role: { key: RoleType.STUDENT } } } }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true, email: true } }),
    prisma.instructorAssignment.findMany({ where: { instructorId: session.user.id }, select: { studentId: true } }),
    session.user.roles.includes(RoleType.INSTRUCTOR) ? listEnrollmentInvites(session.user.id) : Promise.resolve([]),
    prisma.doubtThread.count({ where: isAdmin ? { status: { not: "CLOSED" } } : { instructorId: session.user.id, status: { not: "CLOSED" } } }),
  ]);
  const assigned = new Set(assignedIds.map((entry) => entry.studentId));
  const totalCompleted = students.reduce((sum, student) => sum + student.completed, 0);
  const totalInProgress = students.reduce((sum, student) => sum + student.inProgress, 0);
  const serializedInvites = invites.map((invite) => ({ ...invite, expiresAt: invite.expiresAt.toISOString(), revokedAt: invite.revokedAt?.toISOString() ?? null, createdAt: invite.createdAt.toISOString(), registrations: invite.registrations.map((registration) => ({ ...registration, createdAt: registration.createdAt.toISOString() })) }));

  return <section className="shell py-10 sm:py-14"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Instructor workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Student progress</h1><p className="mt-3 muted">Instructor views are server-scoped to assigned students. Administrators can inspect the complete student population.</p></div><Link href="/instructor/doubts" className="button-secondary flex items-center gap-2"><MessageCircleQuestion size={17} />Doubt inbox · {openDoubts}</Link></div><div className="stat-grid mt-8"><Stat icon={UsersRound} label="Visible students" value={students.length} /><Stat icon={CheckCircle2} label="Verified completions" value={totalCompleted} /><Stat icon={CircleDashed} label="Labs in progress" value={totalInProgress} /></div><div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><section className="panel p-6"><p className="eyebrow">Progress</p><h2 className="mt-2 text-2xl font-semibold">Assigned learner overview</h2><div className="mt-5 space-y-4">{students.length ? students.map((student) => <article key={student.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">{student.displayName}</h3><p className="text-sm muted">{student.email}</p></div><span className="status-pill">{student.completionPct}% complete</span></div><div className="mt-3 flex flex-wrap gap-3 text-sm muted"><span>{student.completed} completed</span><span>{student.inProgress} in progress</span>{student.suspended ? <span>Suspended</span> : null}</div>{student.recentProgress.length ? <ul className="mt-3 space-y-2">{student.recentProgress.map((item) => <li key={item.labNumber} className="text-sm">Lab {String(item.labNumber).padStart(2,"0")} · {item.labTitle} — {item.completionPct}%</li>)}</ul> : <p className="mt-3 text-sm muted">No lab progress yet.</p>}</article>) : <p className="text-sm muted">No students are currently visible.</p>}</div></section>{session.user.roles.includes(RoleType.INSTRUCTOR) ? <AssignmentManager instructorId={session.user.id} students={allStudents.map((student) => ({ ...student, assigned: assigned.has(student.id) }))} /> : <section className="panel p-6"><p className="eyebrow">Admin view</p><h2 className="mt-2 text-2xl font-semibold">All students visible</h2><p className="mt-3 text-sm muted">Administrators manage instructor accounts and assignments from the admin console.</p></section>}</div>{session.user.roles.includes(RoleType.INSTRUCTOR) ? <div className="mt-8"><EnrollmentLinkManager initialInvites={serializedInvites} /></div> : null}</section>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number }) { return <div className="stat-card"><span className="stat-icon"><Icon size={20} /></span><div><p className="text-sm muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></div>; }
