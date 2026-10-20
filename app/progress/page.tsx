import type { Metadata } from "next";
import Link from "next/link";
import { RoleType } from "@prisma/client";
import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { summarizeProgress } from "@/lib/dashboard/stats";

export const metadata: Metadata = { title: "My Progress" };

export default async function ProgressPage() {
  const { user } = await requireRole([RoleType.STUDENT]);
  const [labs, progress] = await Promise.all([
    prisma.lab.findMany({ where: { enabled: true }, orderBy: { number: "asc" } }),
    prisma.labProgress.findMany({ where: { userId: user.id } }),
  ]);
  const byLab = new Map(progress.map((entry) => [entry.labId, entry]));
  const stats = summarizeProgress(labs.length, progress.map((entry) => entry.status));
  return <section className="shell py-10 sm:py-14"><div><p className="eyebrow">Learning analytics</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">My progress</h1><p className="mt-3 muted">{stats.completed} of {stats.totalLabs} labs completed · {stats.completionPercentage}% overall.</p></div><div className="mt-7 h-3 overflow-hidden rounded-full" style={{ background: "var(--accent-soft)" }} aria-label={`${stats.completionPercentage}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.completionPercentage}><div className="h-full rounded-full" style={{ width: `${stats.completionPercentage}%`, background: "var(--accent)" }} /></div><div className="mt-8 grid gap-3">{labs.map((lab) => { const item = byLab.get(lab.id); const status = item?.status ?? "NOT_STARTED"; return <Link key={lab.id} href={`/labs/${lab.slug}`} className="progress-row focus-ring"><div className="flex min-w-0 items-center gap-3"><span className="stat-icon"><BarChart3 size={17} /></span><div className="min-w-0"><p className="truncate font-medium">Lab {String(lab.number).padStart(2, "0")} · {lab.title}</p><p className="mt-1 text-xs muted">{lab.platform} · {lab.difficulty}</p></div></div><div className="text-right"><span className="status-pill">{status.replaceAll("_", " ")}</span><p className="mt-2 text-xs muted">{item?.completionPct ?? 0}%</p></div></Link>; })}</div></section>;
}
