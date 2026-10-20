import type { Metadata } from "next";
import { RoleType } from "@prisma/client";
import { Activity, Database, ShieldCheck, Users } from "lucide-react";
import { AdminConsole } from "@/components/admin-console";
import { AssignmentConsole } from "@/components/assignment-console";
import { requireRole } from "@/lib/auth/rbac";
import { getAdminOverview } from "@/lib/management/service";
import { getPlatformControls } from "@/lib/management/settings";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  await requireRole([RoleType.ADMIN]);
  const [overview, controls, assignments, counts, dbProbe] = await Promise.all([
    getAdminOverview(),
    getPlatformControls(),
    prisma.instructorAssignment.findMany({ orderBy: { createdAt: "desc" }, include: { instructor: { select: { displayName: true, email: true } }, student: { select: { displayName: true, email: true } } } }),
    Promise.all([prisma.user.count(), prisma.lab.count({ where: { enabled: true } }), prisma.auditLog.count(), prisma.labEnvironment.count()]),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ]);
  const [users, labs, audits, environments] = counts;
  return <section className="shell py-10 sm:py-14"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Administration</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Platform control plane</h1><p className="mt-3 muted">Manage users, assignments, labs, versions, visibility policy, quotas, and operational health from server-authorized controls.</p></div><span className="status-pill"><ShieldCheck size={15} /> Admin only</span></div>
    <div className="stat-grid mt-8"><Stat icon={Users} label="Users" value={users} /><Stat icon={ShieldCheck} label="Enabled labs" value={labs} /><Stat icon={Activity} label="Audit events" value={audits} /><Stat icon={Database} label="Lab environments" value={environments} /></div>
    <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><div className="flex flex-wrap items-center gap-3"><strong>Operational health</strong><span className="status-pill">SQLite: {dbProbe ? "Operational" : "Unavailable"}</span><span className="status-pill">Recent audit window: {overview.audits.length}</span><span className="status-pill">Environment count: {environments}</span></div></div>
    <div className="mt-8 space-y-8"><AssignmentConsole users={overview.users} assignments={assignments} /><AdminConsole users={overview.users} labs={overview.labs} controls={controls} /></div>
    <section className="panel mt-8 p-6"><p className="eyebrow">Audit trail</p><h2 className="mt-2 text-2xl font-semibold">Recent administrative and security events</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Time</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Target</th></tr></thead><tbody>{overview.audits.map((event) => <tr key={event.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-2 whitespace-nowrap">{event.createdAt.toLocaleString()}</td><td className="p-2">{event.actor?.displayName ?? "System"}</td><td className="p-2"><code>{event.action}</code></td><td className="p-2">{event.targetType ?? "—"}</td></tr>)}</tbody></table></div></section>
  </section>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) { return <div className="stat-card"><span className="stat-icon"><Icon size={20} /></span><div><p className="text-sm muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></div>; }
