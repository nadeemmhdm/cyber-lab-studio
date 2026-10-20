import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, Layers3, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { LabStartControls } from "@/components/labs/lab-start-controls";
import { getCurrentSession } from "@/lib/auth/session";
import { LABS, getLabBySlug } from "@/lib/labs/catalog";
import { resolvePublishedLab } from "@/lib/labs/engine";

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
  const catalogLab = getLabBySlug(slug);
  if (!catalogLab) notFound();
  const session = await getCurrentSession();
  const runtime = await resolvePublishedLab(slug).catch(() => null);

  return (
    <section className="shell py-12 sm:py-16">
      <Link href="/labs" className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-medium muted hover:text-[var(--foreground)]"><ArrowLeft size={16} aria-hidden="true" /> Back to all labs</Link>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <article className="glass rounded-3xl p-6 sm:p-9">
          <p className="eyebrow">Lab {String(catalogLab.number).padStart(2, "0")}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">{catalogLab.title}</h1>
          <p className="mt-5 text-lg leading-8 muted">{catalogLab.objective}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}><Layers3 size={18} style={{ color: "var(--accent)" }} /><div className="mt-3 text-sm font-semibold">Platform</div><div className="mt-1 text-sm muted">{catalogLab.platform.replaceAll("_", " ")}</div></div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}><ShieldAlert size={18} style={{ color: "var(--accent)" }} /><div className="mt-3 text-sm font-semibold">Difficulty</div><div className="mt-1 text-sm muted">{catalogLab.difficulty.toLowerCase()}</div></div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}><Clock3 size={18} style={{ color: "var(--accent)" }} /><div className="mt-3 text-sm font-semibold">Estimated time</div><div className="mt-1 text-sm muted">{catalogLab.estimatedMinutes} minutes</div></div>
          </div>
          {runtime ? (
            <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--accent-soft)" }}>
              <h2 className="font-semibold">Published runtime v{runtime.version.version}</h2>
              <p className="mt-2 text-sm leading-6 muted">This lab now has a versioned, student-isolated environment with deterministic reset and persisted task progress. Simulator capabilities depend on the platform phase.</p>
            </div>
          ) : null}
        </article>
        <aside className="glass h-fit rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Start training</h2>
          <p className="mt-2 text-sm leading-6 muted">Choose how much guidance you want. Your environment is scoped to your account and persists independently from other students.</p>
          <div className="mt-5"><LabStartControls slug={slug} signedIn={Boolean(session)} /></div>
          {session ? <Link className="button-secondary mt-3 flex w-full justify-center" href={`/labs/${slug}/workspace`}>Open existing workspace</Link> : null}
        </aside>
      </div>
    </section>
  );
}
