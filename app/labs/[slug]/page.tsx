import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, Layers3, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { LABS, getLabBySlug } from "@/lib/labs/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LABS.map((lab) => ({ slug: lab.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lab = getLabBySlug(slug);
  if (!lab) return { title: "Lab not found" };
  return { title: `Lab ${lab.number}: ${lab.title}`, description: lab.objective };
}

export default async function LabDetailPage({ params }: Props) {
  const { slug } = await params;
  const lab = getLabBySlug(slug);
  if (!lab) notFound();

  return (
    <section className="shell py-12 sm:py-16">
      <Link href="/labs" className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-medium muted hover:text-[var(--foreground)]">
        <ArrowLeft size={16} aria-hidden="true" /> Back to all labs
      </Link>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <article className="glass rounded-3xl p-6 sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            Lab {String(lab.number).padStart(2, "0")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">{lab.title}</h1>
          <p className="mt-5 text-lg leading-8 muted">{lab.objective}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
              <Layers3 size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
              <div className="mt-3 text-sm font-semibold">Platform</div>
              <div className="mt-1 text-sm muted">{lab.platform.replaceAll("_", " ")}</div>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
              <ShieldAlert size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
              <div className="mt-3 text-sm font-semibold">Difficulty</div>
              <div className="mt-1 text-sm muted">{lab.difficulty.toLowerCase()}</div>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
              <Clock3 size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
              <div className="mt-3 text-sm font-semibold">Estimated time</div>
              <div className="mt-1 text-sm muted">{lab.estimatedMinutes} minutes</div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--accent-soft)" }}>
            <h2 className="font-semibold">Lab runtime status</h2>
            <p className="mt-2 text-sm leading-6 muted">
              This route is part of the runnable foundation. The stateful lab workspace, simulator commands, progressive hints, validation, and student-specific flags are activated in the lab-engine and simulator phases rather than being represented by fake buttons or canned success output.
            </p>
          </div>
        </article>

        <aside className="rounded-3xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-lg font-semibold">Required lab structure</h2>
          <ol className="mt-4 grid gap-2 text-sm muted">
            {["Overview and objectives", "Prerequisites and concept explanation", "Scenario and initial environment", "Tasks and supported operations", "Three progressive hint levels", "Complete educational solution", "Validation and reset", "Verified completion and unique flag"].map((item, index) => (
              <li key={item} className="flex gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
                <span className="font-semibold" style={{ color: "var(--accent)" }}>{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
