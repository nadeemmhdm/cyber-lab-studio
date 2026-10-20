import Link from "next/link";
import { ArrowRight, CheckCircle2, Cloud, Database, Search, ShieldCheck, TerminalSquare } from "lucide-react";

const FEATURES = [
  { icon: Cloud, title: "Cloud simulators", text: "Stateful AWS and Azure-style training environments without exposing real cloud credentials." },
  { icon: TerminalSquare, title: "Command practice", text: "A command-registry architecture designed for explicit syntax, permission checks, real state changes, and real errors." },
  { icon: Search, title: "Security investigations", text: "Sentinel, KQL, and Defender XDR learning paths built around synthetic security datasets and incident workflows." },
  { icon: Database, title: "Persistent progress", text: "PostgreSQL-backed lab state, attempts, progress, validation, completions, flags, audit events, and achievements." },
];

const PRINCIPLES = [
  "30 cloud-security labs in one catalogue",
  "Student lab state isolated per user and lab version",
  "Server-side completion validation and unique flags",
  "Dark, light, and system themes",
  "Instructor and admin architecture",
  "Local-first Windows development with private PostgreSQL",
];

export default function HomePage() {
  return (
    <>
      <section className="shell grid gap-12 py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--accent)" }}>
            <ShieldCheck size={16} aria-hidden="true" />
            Safe, stateful cloud-security practice
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Learn cloud security by doing the work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 muted sm:text-xl">
            CyberLab Studio Pro is being built as a real multi-user training platform for AWS, Azure, Microsoft Sentinel, KQL, and Defender XDR—not a static demo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/labs" className="focus-ring inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white" style={{ background: "var(--accent)" }}>
              Explore all 30 labs <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/api/health" className="focus-ring rounded-xl border px-5 py-3 font-semibold" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
              System health
            </Link>
          </div>
        </div>

        <aside className="glass rounded-3xl p-6 sm:p-8" aria-label="Platform foundation">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Foundation</p>
          <h2 className="mt-3 text-2xl font-semibold">Built around verifiable state</h2>
          <p className="mt-3 leading-7 muted">
            Commands, queries, lab progress, validation, and completion are designed around server-owned state. Unsupported operations must fail explicitly instead of returning fake success.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[ ["30", "Labs"], ["18", "AWS labs"], ["4", "Azure labs"], ["8", "SIEM / KQL / XDR"] ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
                <div className="text-2xl font-semibold">{value}</div>
                <div className="mt-1 text-sm muted">{label}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="shell py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <Icon size={20} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">{title}</h2>
              <p className="mt-2 leading-7 muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shell py-16">
        <div className="glass rounded-3xl p-7 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Engineering rules</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">No fake-success simulator behavior.</h2>
              <p className="mt-4 leading-7 muted">The platform is structured so learning outcomes can be validated against actual stored simulator state.</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PRINCIPLES.map((principle) => (
                <li key={principle} className="flex gap-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
                  <CheckCircle2 className="mt-0.5 shrink-0" size={18} style={{ color: "var(--success)" }} aria-hidden="true" />
                  <span className="text-sm leading-6">{principle}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
