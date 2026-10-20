import type { Metadata } from "next";
import { RoleType } from "@prisma/client";
import { Activity, AlertTriangle, Database, GraduationCap, LifeBuoy, ServerCog, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import { AdminConsole } from "@/components/admin/admin-console";
import { InstructorProvisioner } from "@/components/admin/instructor-provisioner";
import { AdminSupportDesk } from "@/components/admin/support-desk";
import { requireRole } from "@/lib/auth/rbac";
import { getAdminOverview } from "@/lib/management/service";
import { getPerformanceSummary, measureOperation, PERFORMANCE_BUDGETS_MS, prunePerformanceSamples } from "@/lib/observability/performance";
import { profileSqlite } from "@/lib/observability/sqlite";
import { listAdminSupportTickets } from "@/lib/support/service";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireRole([RoleType.ADMIN]);
  const measured = await measureOperation("management.admin.overview", () => getAdminOverview());
  const [performance, sqlite, supportTickets] = await Promise.all([
    getPerformanceSummary(500),
    profileSqlite(),
    listAdminSupportTickets(),
  ]);
  await prunePerformanceSamples(2000).catch(() => undefined);
  const data = measured.result;
  const activeSupport = supportTickets.filter((ticket) => ticket.status === "OPEN" || ticket.status === "IN_PROGRESS").length;
  const solvedSupport = supportTickets.filter((ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED").length;
  const tickets = supportTickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    user: {
      id: ticket.user.id,
      displayName: ticket.user.displayName,
      email: ticket.user.email,
      suspended: Boolean(ticket.user.suspendedAt),
      roles: ticket.user.roles.map((entry) => entry.role.key),
    },
    replies: ticket.replies.map((reply) => ({
      id: reply.id,
      message: reply.message,
      isAdminReply: reply.isAdminReply,
      createdAt: reply.createdAt.toISOString(),
      author: reply.author,
    })),
  }));

  return <section className="shell py-8 sm:py-12">
    <div className="panel overflow-hidden p-0">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_.8fr] lg:items-end">
        <div><p className="eyebrow">Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Platform operations center</h1><p className="mt-3 max-w-3xl text-sm leading-6 muted sm:text-base">Manage identities, instructor onboarding, learning policy, support, audit evidence, database health, and measured runtime performance from one server-authorized workspace.</p></div>
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--accent-soft)" }}><div className="flex items-center gap-3"><span className="stat-icon"><ServerCog size={19} /></span><div><p className="text-xs font-semibold uppercase tracking-[.16em] muted">Runtime</p><p className="mt-1 font-semibold">{data.health.database} · SQLite {data.health.sqliteVersion}</p></div></div><p className="mt-3 text-xs leading-5 muted">Admin overview {measured.durationMs.toFixed(1)} ms · SQLite sample {sqlite.sampleQueryMs.toFixed(1)} ms</p></div>
      </div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Stat icon={UsersRound} label="Users" value={data.health.users} />
      <Stat icon={Activity} label="Active labs" value={data.health.activeEnvironments} />
      <Stat icon={ShieldCheck} label="Verified" value={data.health.completions} />
      <Stat icon={LifeBuoy} label="Open support" value={activeSupport} />
      <Stat icon={AlertTriangle} label="Failed validations" value={data.health.failedValidations} />
    </div>

    <AdminSection icon={GraduationCap} eyebrow="Accounts & enrollment" title="Instructor provisioning" description="Create instructor identities and hand off student onboarding through controlled enrollment links."><InstructorProvisioner /></AdminSection>
    <AdminSection icon={SlidersHorizontal} eyebrow="Platform policy" title="Users, labs & controls" description="Manage account state, roles, curriculum availability, learning modes, maintenance policy, quotas, hints, and solutions."><AdminConsole initialUsers={data.users} labs={data.labs} initialControls={data.controls} /></AdminSection>
    <AdminSection icon={LifeBuoy} eyebrow="Support operations" title="User issue desk" description={`There are ${activeSupport} active ticket(s). Solved/closed tickets remain visible for 24 hours, then are automatically purged with their replies. ${solvedSupport} solved ticket(s) are currently inside that retention window.`}><AdminSupportDesk tickets={tickets} /></AdminSection>

    <section className="panel mt-6 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow">Performance</p><h2 className="mt-2 text-2xl font-semibold">Measured budgets & SQLite profile</h2><p className="mt-2 text-sm muted">Journal: {sqlite.journalMode} · foreign keys: {sqlite.foreignKeys ? "on" : "off"}.</p></div><span className="stat-icon"><Database size={20} /></span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(PERFORMANCE_BUDGETS_MS).map(([name, value]) => <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} key={name}><p className="truncate text-xs muted">{name}</p><strong>≤ {value} ms</strong></div>)}</div>
      <details className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><summary className="cursor-pointer font-semibold">SQLite query plan</summary><ul className="mt-3 space-y-1 overflow-x-auto text-sm muted">{sqlite.userHistoryPlan.map((line) => <li key={line}><code>{line}</code></li>)}</ul></details>
      {performance.length ? <div className="mt-5 overflow-x-auto"><table className="min-w-[620px] w-full text-left text-sm"><thead><tr><th className="p-2">Operation</th><th className="p-2">Samples</th><th className="p-2">p50</th><th className="p-2">p95</th><th className="p-2">max</th></tr></thead><tbody>{performance.map((item) => <tr key={item.name} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-2"><code>{item.name}</code></td><td className="p-2">{item.count}</td><td className="p-2">{item.p50.toFixed(1)} ms</td><td className="p-2">{item.p95.toFixed(1)} ms</td><td className="p-2">{item.max.toFixed(1)} ms</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm muted">Performance samples appear as instrumented operations are used.</p>}
    </section>

    <section className="panel mt-6 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Operational evidence</p><h2 className="mt-2 text-2xl font-semibold">Audit & failure view</h2></div><span className="stat-icon"><ShieldCheck size={20} /></span></div>
      <p className="mt-2 text-sm muted">Recent privileged actions and system evidence. Failed validations: {data.health.failedValidations}.</p>
      <div className="mt-5 max-h-[520px] overflow-auto"><table className="min-w-[700px] w-full text-left text-sm"><thead className="sticky top-0" style={{ background: "var(--panel)" }}><tr><th className="p-2">Time</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Target</th></tr></thead><tbody>{data.auditLogs.map((entry) => <tr key={entry.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-2 whitespace-nowrap">{entry.createdAt.toLocaleString()}</td><td className="p-2">{entry.actor?.displayName ?? "System"}</td><td className="p-2"><code>{entry.action}</code></td><td className="p-2">{entry.targetType ?? "—"} {entry.targetId ?? ""}</td></tr>)}</tbody></table></div>
    </section>
  </section>;
}

function AdminSection({ icon: Icon, eyebrow, title, description, children }: { icon: typeof Activity; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="mt-6"><div className="mb-3 flex items-start gap-3"><span className="stat-icon shrink-0"><Icon size={19} /></span><div><p className="eyebrow">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold sm:text-2xl">{title}</h2><p className="mt-1 max-w-4xl text-sm leading-6 muted">{description}</p></div></div>{children}</section>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) {
  return <div className="stat-card min-w-0"><span className="stat-icon shrink-0"><Icon size={20} aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm muted">{label}</p><p className="mt-1 truncate text-2xl font-semibold">{value}</p></div></div>;
}
