import type { Metadata } from "next";
import { LabCatalogue } from "@/components/lab-catalogue";
import { LABS } from "@/lib/labs/catalog";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "All Labs", description: "Browse the complete CyberLab Studio Pro cloud-security lab catalogue." };
export default async function LabsPage() { const session = await getCurrentSession(); const rows = session ? await prisma.labProgress.findMany({ where: { userId: session.user.id }, include: { lab: { select: { number: true } } } }) : []; const progress = Object.fromEntries(rows.map((row) => [row.lab.number, row.status])); return <section className="shell py-12 sm:py-16"><div className="max-w-3xl"><p className="eyebrow">Training catalogue</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">All 30 cloud-security labs</h1><p className="mt-4 text-lg leading-8 muted">Browse fundamentals, AWS, Azure, Microsoft Sentinel, KQL, and Defender XDR labs from one searchable catalogue.{session ? " Your saved progress is shown on every card." : " Sign in to track progress."}</p></div><div className="mt-8"><LabCatalogue labs={LABS} progress={progress} /></div></section>; }
