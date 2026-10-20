import type { Metadata } from "next";
import Link from "next/link";
import { RoleType } from "@prisma/client";
import { requireRole } from "@/lib/auth/rbac";
import { listStudentDoubts } from "@/lib/doubts/service";

export const metadata: Metadata = { title: "My Doubts" };

export default async function DoubtsPage() {
  const session = await requireRole([RoleType.STUDENT]);
  const doubts = await listStudentDoubts(session.user.id);
  return <section className="shell py-10 sm:py-14"><p className="eyebrow">Learning support</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">My doubts</h1><p className="mt-3 muted">Questions you sent from lab workspaces stay here as continuous conversations with your assigned instructor.</p><div className="mt-8 space-y-3">{doubts.length ? doubts.map((thread) => <Link key={thread.id} href={`/doubts/${thread.id}`} className="panel block p-5 transition hover:-translate-y-0.5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Lab {String(thread.lab.number).padStart(2,"0")}</p><h2 className="mt-1 text-lg font-semibold">{thread.lab.title}</h2><p className="mt-1 text-sm muted">Instructor: {thread.instructor.displayName}</p></div><span className="status-pill">{thread.status}</span></div><p className="mt-4 line-clamp-2 text-sm leading-6 muted">{thread.messages[0]?.message ?? "No messages yet."}</p><p className="mt-2 text-xs muted">Updated {thread.updatedAt.toLocaleString()}</p></Link>) : <div className="panel p-6"><h2 className="font-semibold">No doubts yet</h2><p className="mt-2 text-sm muted">Open any lab workspace and choose “Ask a doubt” when you need help.</p></div>}</div></section>;
}
