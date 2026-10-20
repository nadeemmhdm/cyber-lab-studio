import type { Metadata } from "next";
import Link from "next/link";
import { RoleType } from "@prisma/client";
import { Activity, ArrowRight, CheckCircle2, CircleDashed, Flag, FlaskConical, TerminalSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { summarizeProgress } from "@/lib/dashboard/stats";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await requireRole([RoleType.STUDENT]);
  const [labs, progress, recentCommands, recentQueries, flags] = await Promise.all([
    prisma.lab.findMany({ where: { enabled: true }, orderBy: { number: "asc" }, select: { id: true, number: true, slug: true, title: true, platform: true } }),
    prisma.labProgress.findMany({ where: { userId: user.id }, include: { lab: { select: { number: true, slug: true, title: true } } } }),
    prisma.terminalHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.queryHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.flag.findMany({ where: { userId: user.id }, orderBy: { issuedAt: "desc" }, take: 5, include: { lab: { select: { number: true, title: true } } } }),
  ]);
  const stats = summarizeProgress(labs.length, progress.map((entry) => entry.status));
  const progressByLab = new Map(progress.map((entry) => [entry.labId, entry]));
  const nextLab = labs.find((lab) => progressByLab.get(lab.id)?.status === "IN_PROGRESS") ?? labs.find((lab) => progressByLab.get(lab.id)?.status !== "COMPLETED");

  return (
    <section className="shell motion-page py-10 sm:py-14">
      <div className="motion-rise flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="eyebrow">Student dashboard</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Welcome, {user.displayName}</h1><p className="mt-3 muted">Your progress is calculated from SQLite-backed server state, not browser state.</p></div>
        {nextLab ? <Link className="button-primary inline-flex items-center gap-2" href={`/labs/${nextLab.slug}`}>Continue learning <ArrowRight size={16} aria-hidden="true" /></Link> : null}
      </div>
      <div className="stat-grid stagger-grid mt-8"><Stat icon={FlaskConical} label="Total labs" value={stats.totalLabs} /><Stat icon={CheckCircle2} label="Completed" value={stats.completed} /><Stat icon={CircleDashed} label="In progress" value={stats.inProgress} /><Stat icon={Activity} label="Completion" value={`${stats.completionPercentage}%`} /></div>
      <div className="stagger-grid mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="panel interactive-card p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Learning path</p><h2 className="mt-2 text-2xl font-semibold">Next recommended lab</h2></div><span className="status-pill">{stats.notStarted} not started</span></div>{nextLab ? <div className="interactive-card mt-6 rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Lab {String(nextLab.number).padStart(2, "0")} · {nextLab.platform}</p><h3 className="mt-2 text-xl font-semibold">{nextLab.title}</h3><Link className="text-link mt-4 inline-flex items-center gap-1" href={`/labs/${nextLab.slug}`}>Open lab <ArrowRight size={15} /></Link></div> : <EmptyState icon={CheckCircle2} title="Catalogue complete" description="There are no remaining enabled labs in your learning path." />}</div><div className="panel interactive-card p-6"><p className="eyebrow">Flags</p><h2 className="mt-2 text-2xl font-semibold">Recently earned</h2>{flags.length ? <ul className="stagger-grid mt-5 space-y-3">{flags.map((flag) => <li key={flag.id} className="interactive-card rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><div className="flex items-center gap-2 font-medium"><Flag size={16} style={{ color: "var(--success)" }} />Lab {String(flag.lab.number).padStart(2, "0")}</div><p className="mt-1 text-sm muted">{flag.lab.title}</p></li>)}</ul> : <div className="mt-5"><EmptyState icon={Flag} title="No flags yet" description="Verified lab completions will appear here." /></div>}</div></div>
      <div className="stagger-grid mt-6 grid gap-6 lg:grid-cols-2"><HistoryCard title="Recent commands" icon={TerminalSquare} items={recentCommands.map((item) => ({ id: item.id, primary: item.command, secondary: `Exit ${item.exitCode} · ${item.createdAt.toLocaleString()}` }))} /><HistoryCard title="Recent queries" icon={Activity} items={recentQueries.map((item) => ({ id: item.id, primary: item.query, secondary: `${item.rowCount} rows · ${item.executionMs} ms` }))} /></div>
    </section>
  );
}
function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) { return <div className="stat-card"><span className="stat-icon"><Icon size={20} /></span><div><p className="text-sm muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></div>; }
function HistoryCard({ title, icon: Icon, items }: { title: string; icon: typeof Activity; items: { id: string; primary: string; secondary: string }[] }) { return <div className="panel interactive-card p-6"><div className="flex items-center gap-2"><Icon size={18} style={{ color: "var(--accent)" }} /><h2 className="text-xl font-semibold">{title}</h2></div>{items.length ? <ul className="stagger-grid mt-5 space-y-3">{items.map((item) => <li key={item.id} className="interactive-card rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><code className="block truncate text-sm">{item.primary}</code><p className="mt-1 text-xs muted">{item.secondary}</p></li>)}</ul> : <p className="mt-5 text-sm muted">No activity recorded yet.</p>}</div>; }
