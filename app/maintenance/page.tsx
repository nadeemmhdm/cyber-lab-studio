import type { Metadata } from "next";
import { RoleType } from "@prisma/client";
import { Wrench } from "lucide-react";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformControls } from "@/lib/platform/settings";

export const metadata: Metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.roles.includes(RoleType.ADMIN)) redirect("/admin");
  const controls = await getPlatformControls();
  if (!controls.maintenance.enabled) {
    if (session.user.roles.includes(RoleType.INSTRUCTOR)) redirect("/instructor");
    redirect("/dashboard");
  }
  return <section className="shell grid min-h-[70vh] place-items-center py-12"><div className="panel max-w-2xl p-8 text-center sm:p-10"><span className="stat-icon mx-auto"><Wrench size={24} aria-hidden="true" /></span><p className="eyebrow mt-5">Scheduled maintenance</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">CyberLab is temporarily unavailable</h1><p className="mx-auto mt-4 max-w-xl text-base leading-7 muted">{controls.maintenance.message}</p><p className="mt-5 text-sm muted">Your account and lab progress remain saved. Please try again after maintenance is complete.</p><div className="mt-7 flex justify-center"><LogoutButton /></div></div></section>;
}
