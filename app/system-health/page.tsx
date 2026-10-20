import type { Metadata } from "next";
import { RoleType } from "@prisma/client";
import { CheckCircle2, Database, HeartPulse, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "System Health" };

export default async function SystemHealthPage() {
  await requireRole([RoleType.ADMIN]);
  let database = true;
  let enabledLabs = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    enabledLabs = await prisma.lab.count({ where: { enabled: true } });
  } catch {
    database = false;
  }
  const authConfigured = firebaseAdminConfigured();
  const checks = [
    { icon: Database, label: "SQLite", value: database ? "Operational" : "Unavailable", ok: database },
    { icon: ShieldCheck, label: "Firebase Admin", value: authConfigured ? "Configured" : "Not configured", ok: authConfigured },
    { icon: HeartPulse, label: "Enabled labs", value: String(enabledLabs), ok: database },
  ];
  return <section className="shell py-10 sm:py-14"><p className="eyebrow">Runtime status</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">System health</h1><p className="mt-3 muted">Administrator-only live checks expose platform availability without exposing credentials or internal secrets.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{checks.map(({ icon: Icon, label, value, ok }) => <article className="panel p-5" key={label}><div className="flex items-center justify-between"><span className="stat-icon"><Icon size={20} /></span><CheckCircle2 size={18} style={{ color: ok ? "var(--success)" : "var(--danger)" }} /></div><p className="mt-5 text-sm muted">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></article>)}</div></section>;
}
