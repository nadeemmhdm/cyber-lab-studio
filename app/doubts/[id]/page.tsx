import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DoubtThread } from "@/components/doubts/doubt-thread";
import { requireUser } from "@/lib/auth/session";
import { DoubtError, getDoubtThread } from "@/lib/doubts/service";

export const metadata: Metadata = { title: "Doubt Conversation" };

export default async function DoubtPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser();
  const { id } = await params;
  try {
    const data = await getDoubtThread(user.id, id);
    const messages = data.messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() }));
    const backHref = data.roles.some((role) => role === "INSTRUCTOR" || role === "ADMIN") && data.thread.instructorId === user.id ? "/instructor/doubts" : "/doubts";
    return <section className="shell py-10 sm:py-14"><Link className="text-link" href={backHref}>← Back to doubt inbox</Link><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Lab {String(data.thread.lab.number).padStart(2,"0")} · {data.thread.lab.title}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Doubt conversation</h1><p className="mt-2 text-sm muted">Student: {data.thread.student.username ?? data.thread.student.displayName} · Instructor: {data.thread.instructor.displayName}</p></div></div><div className="mt-8"><DoubtThread threadId={id} currentUserId={user.id} initialStatus={data.thread.status} messages={messages} /></div></section>;
  } catch (error) {
    if (error instanceof DoubtError && error.status === 404) notFound();
    throw error;
  }
}
