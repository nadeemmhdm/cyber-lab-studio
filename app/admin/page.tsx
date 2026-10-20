import type { Metadata } from "next";
import { RoleType } from "@prisma/client";
import { Activity, Database, ShieldCheck, UsersRound } from "lucide-react";
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

  return (
    <section className="shell py-10 sm:py-14">
      <p className="eyebrow">Administration</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Platform control center</h1>
      <p className="mt-3 muted">Server-authorized controls for users, instructor provisioning, curriculum, support, platform policy, audit history, operational health, and bounded performance telemetry.</p>

      <div className="stat-grid mt-8">
        <Stat icon={UsersRound} label="Users" value={data.health.users} />
        <Stat icon={Activity} label="Active environments" value={data.health.activeEnvironments} />
        <Stat icon={ShieldCheck} label="Completions" value={data.health.completions} />
        <Stat icon={Database} label="SQLite" value={data.health.sqliteVersion} />
      </div>

      <div className="mt-8"><InstructorProvisioner /></div>
      <div className="mt-8"><AdminConsole initialUsers={data.users} labs={data.labs} initialControls={data.controls} /></div>
      <div className="mt-8"><AdminSupportDesk tickets={tickets} /></div>

      <section className="panel mt-8 p-6">
        <p className="eyebrow">Performance</p>
        <h2 className="mt-2 text-2xl font-semibold">Measured budgets & SQLite profile</h2>
        <p className="mt-2 text-sm muted">Current admin overview: {measured.durationMs.toFixed(1)} ms · SQLite sample: {sqlite.sampleQueryMs.toFixed(1)} ms · journal: {sqlite.journalMode} · foreign keys: {sqlite.foreignKeys ? "on" : "off"}.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Object.entries(PERFORMANCE_BUDGETS_MS).map(([name, value]) => <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} key={name}><p className="text-xs muted">{name}</p><strong>≤ {value} ms</strong></div>)}</div>
        <details className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><summary className="cursor-pointer font-semibold">SQLite query plan</summary><ul className="mt-3 space-y-1 text-sm muted">{sqlite.userHistoryPlan.map((line) => <li key={line}><code>{line}</code></li>)}</ul></details>
        {performance.length ? <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Operation</th><th className="p-2">Samples</th><th className="p-2">p50</th><th className="p-2">p95</th><th className="p-2">max</th></tr></thead><tbody>{performance.map((item) => <tr key={item.name} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-2"><code>{item.name}</code></td><td className="p-2">{item.count}</td><td className="p-2">{item.p50.toFixed(1)} ms</td><td className="p-2">{item.p95.toFixed(1)} ms</td><td className="p-2">{item.max.toFixed(1)} ms</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm muted">Performance samples appear as instrumented operations are used.</p>}
      </section>

      <section className="panel mt-8 p-6">
        <p className="eyebrow">Operational evidence</p>
        <h2 className="mt-2 text-2xl font-semibold">Audit & failure view</h2>
        <p className="mt-2 text-sm muted">Failed validations: {data.health.failedValidations} · database: {data.health.database}</p>
        <div className="mt-5 max-h-[520px] overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Time</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Target</th></tr></thead><tbody>{data.auditLogs.map((entry) => <tr key={entry.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-2 whitespace-nowrap">{entry.createdAt.toLocaleString()}</td><td className="p-2">{entry.actor?.displayName ?? "System"}</td><td className="p-2"><code>{entry.action}</code></td><td className="p-2">{entry.targetType ?? "—"} {entry.targetId ?? ""}</td></tr>)}</tbody></table></div>
      </section>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) {
  return <div className="stat-card"><span className="stat-icon"><Icon size={20} aria-hidden="true" /></span><div><p className="text-sm muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></div>;
}
