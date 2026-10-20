import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Database, LockKeyhole, Network, ShieldCheck, TerminalSquare } from "lucide-react";

export const metadata: Metadata = { title: "Documentation" };
const sections = [
  { icon: ShieldCheck, title: "Platform model", text: "CyberLab is simulator-first. Browser actions never execute host-shell commands or receive Firebase Admin, database, flag, or cloud secrets." },
  { icon: LockKeyhole, title: "Authentication", text: "Firebase handles Google and email/password identity, verification links, and password resets; CyberLab uses a verified HttpOnly server session and local server-side RBAC." },
  { icon: Database, title: "Lab state", text: "SQLite through Prisma stores progress, versioned isolated environments, simulated resources, histories, validation, completions, flags, and achievements." },
  { icon: TerminalSquare, title: "Simulator commands", text: "Only documented command families are supported. Unsupported commands fail explicitly instead of returning fake success output." },
  { icon: Network, title: "Cloud exposure", text: "Cloudflare Tunnel may expose only the web application. The SQLite file, Firebase Admin credentials, and simulator internals stay private." },
  { icon: BookOpen, title: "Learning modes", text: "Guided, Practice, and Challenge policies run on the versioned lab engine. Progress is persisted, while completion remains server-validated." },
];
export default function DocsPage() { return <section className="shell py-10 sm:py-14"><p className="eyebrow">Documentation</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">How CyberLab Studio Pro works</h1><p className="mt-3 max-w-3xl text-lg leading-8 muted">Architecture and security boundaries are visible to learners without exposing hidden validation rules or secrets.</p><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sections.map(({ icon: Icon, title, text }) => <article key={title} className="panel p-5"><span className="stat-icon"><Icon size={20} /></span><h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 muted">{text}</p></article>)}</div><div className="mt-8"><Link className="button-primary inline-flex" href="/labs">Browse all labs</Link></div></section>; }
