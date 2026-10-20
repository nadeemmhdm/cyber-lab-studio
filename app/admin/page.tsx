import type { Metadata } from "next";
import { RoleType } from "@prisma/client";
import { Activity, Database, ShieldCheck, UsersRound } from "lucide-react";
import { AdminConsole } from "@/components/admin/admin-console";
import { requireRole } from "@/lib/auth/rbac";
import { getAdminOverview } from "@/lib/management/service";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireRole([RoleType.ADMIN]);
  const data = await getAdminOverview();
  return <section className="shell py-10 sm:py-14"><p className="eyebrow">Administration</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Platform control center</h1><p className="mt-3 muted">Server-authorized controls for users, curriculum, platform policy, audit history, and operational health.</p><div className="stat-grid mt-8"><Stat icon={UsersRound} label="Users" value={data.health.users} /><Stat icon={Activity} label="Active environments" value={data.health.activeEnvironments} /><Stat icon={ShieldCheck} label="Completions" value={data.health.completions} /><Stat icon={Database} label="SQLite" value={data.health.sqliteVersion} /></div><div className="mt-8"><AdminConsole initialUsers={data.users} labs={data.labs} initialControls={data.controls} /></div><section className="panel mt-8 p-6"><p className="eyebrow">Operational evidence</p><h2 className="mt-2 text-2xl font-semibold">Audit & failure view</h2><p className="mt-2 text-sm muted">Failed validations: {data.health.failedValidations} · database: {data.health.database}</p><div className="mt-5 max-h-[520px] overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Time</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Target</th></tr></thead><tbody>{data.auditLogs.map((entry) => <tr key={entry.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-2 whitespace-nowrap">{entry.createdAt.toLocaleString()}</td><td className="p-2">{entry.actor?.displayName ?? "System"}</td><td className="p-2"><code>{entry.action}</code></td><td className="p-2">{entry.targetType ?? "—"} {entry.targetId ?? ""}</td></tr>)}</tbody></table></div></section></section>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) { return <div className="stat-card"><span className="stat-icon"><Icon size={20} /></span><div><p className="text-sm muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></div>; }
