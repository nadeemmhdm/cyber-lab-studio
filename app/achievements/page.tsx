import type { Metadata } from "next";
import { Award } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Achievements" };
export default async function AchievementsPage() { const { user } = await requireUser(); const earned = await prisma.userAchievement.findMany({ where: { userId: user.id }, orderBy: { earnedAt: "desc" }, include: { achievement: true } }); return <section className="shell py-10 sm:py-14"><p className="eyebrow">Milestones</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Achievements</h1><p className="mt-3 muted">Achievements are issued from verified platform activity.</p>{earned.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{earned.map((entry) => <article className="panel p-5" key={entry.achievementId}><span className="stat-icon"><Award size={20} /></span><h2 className="mt-4 text-xl font-semibold">{entry.achievement.name}</h2><p className="mt-2 text-sm leading-6 muted">{entry.achievement.description}</p><p className="mt-4 text-xs muted">Earned {entry.earnedAt.toLocaleDateString()}</p></article>)}</div> : <div className="mt-8"><EmptyState icon={Award} title="No achievements yet" description="Achievement evaluation is issued from verified progress and completion events; earned awards will appear here." /></div>}</section>; }
