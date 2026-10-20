import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Database, LockKeyhole, Network, ShieldCheck, TerminalSquare } from "lucide-react";

export const metadata: Metadata = { title: "Documentation" };
const sections = [
  { icon: ShieldCheck, title: "Platform model", text: "CyberLab is a simulator-first environment. Browser actions never execute host-shell commands or receive database/cloud secrets." },
  { icon: LockKeyhole, title: "Authentication", text: "Accounts use Argon2id passwords, verified email, opaque HttpOnly sessions, server-side roles, and rate-limited auth flows." },
  { icon: Database, title: "Lab state", text: "PostgreSQL is the source of truth for progress, lab attempts, simulated resources, history, validation, completions, flags, and achievements." },
  { icon: TerminalSquare, title: "Simulator commands", text: "Only documented command families are supported. Unsupported commands must fail explicitly instead of returning fake success output." },
  { icon: Network, title: "Cloud exposure", text: "Cloudflare Tunnel may expose only the web application. PostgreSQL and simulator internals stay private." },
  { icon: BookOpen, title: "Learning modes", text: "Guided, Practice, and Challenge modes are implemented with server-side course policy in the lab-engine phase." },
];
export default function DocsPage() { return <section className="shell py-10 sm:py-14"><p className="eyebrow">Documentation</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">How CyberLab Studio Pro works</h1><p className="mt-3 max-w-3xl text-lg leading-8 muted">Architecture and security boundaries are visible to learners without exposing hidden validation rules or secrets.</p><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sections.map(({ icon: Icon, title, text }) => <article key={title} className="panel p-5"><span className="stat-icon"><Icon size={20} /></span><h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 muted">{text}</p></article>)}</div><div className="mt-8"><Link className="button-primary inline-flex" href="/labs">Browse all labs</Link></div></section>; }
