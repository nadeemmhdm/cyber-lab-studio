import type { Metadata } from "next";
import Link from "next/link";
import { RoleType } from "@prisma/client";
import { requireRole } from "@/lib/auth/rbac";
import { listInstructorDoubts } from "@/lib/doubts/service";

export const metadata: Metadata = { title: "Student Doubts" };

export default async function InstructorDoubtsPage() {
  const session = await requireRole([RoleType.INSTRUCTOR, RoleType.ADMIN]);
  const includeAll = session.user.roles.includes(RoleType.ADMIN);
  const doubts = await listInstructorDoubts(session.user.id, includeAll);
  return <section className="shell py-10 sm:py-14"><Link href="/instructor" className="text-link">← Instructor dashboard</Link><p className="eyebrow mt-6">Doubt desk</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Student questions</h1><p className="mt-3 muted">Open conversations from assigned students appear here. Replies remain attached to the originating lab and can include authorized screenshots.</p><div className="mt-8 space-y-3">{doubts.length ? doubts.map((thread) => <Link key={thread.id} href={`/doubts/${thread.id}`} className="panel block p-5 transition hover:-translate-y-0.5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Lab {String(thread.lab.number).padStart(2,"0")} · {thread.lab.title}</p><h2 className="mt-1 text-lg font-semibold">{thread.student.username ?? thread.student.displayName}</h2>{includeAll ? <p className="mt-1 text-sm muted">Assigned instructor: {thread.instructor.displayName}</p> : null}</div><span className="status-pill">{thread.status}</span></div><p className="mt-4 line-clamp-2 text-sm leading-6 muted">{thread.messages[0]?.message ?? "No messages yet."}</p><p className="mt-2 text-xs muted">Updated {thread.updatedAt.toLocaleString()}</p></Link>) : <div className="panel p-6"><h2 className="font-semibold">No student doubts waiting</h2><p className="mt-2 text-sm muted">New questions from assigned students will appear here.</p></div>}</div></section>;
}
