import type { Metadata } from "next";
import Link from "next/link";
import { KQL_SUPPORTED_OPERATORS } from "@/lib/kql/engine";

export const metadata: Metadata = { title: "KQL Compatibility" };

const expressions = [
  "==, !=, >, >=, <, <=",
  "contains, startswith, endswith",
  "and, or, not",
  "+, -, *, /",
  "datetime(), tostring(), tolower(), toupper()",
  "count(), sum(), avg(), min(), max() in summarize",
];

export default function KqlCompatibilityPage() {
  return (
    <section className="shell py-10 sm:py-14">
      <Link href="/docs" className="text-link text-sm">← Documentation</Link>
      <p className="eyebrow mt-5">Native query engine</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">KQL compatibility</h1>
      <p className="mt-3 max-w-3xl leading-7 muted">CyberLab parses queries into an AST and evaluates them against stored synthetic security tables. Results are computed from data; unsupported syntax fails explicitly and is never replaced with canned rows.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="panel p-6"><h2 className="text-xl font-semibold">Pipeline operators</h2><div className="mt-4 flex flex-wrap gap-2">{KQL_SUPPORTED_OPERATORS.map((operator) => <code key={operator} className="status-pill">{operator}</code>)}</div></article>
        <article className="panel p-6"><h2 className="text-xl font-semibold">Expressions & aggregates</h2><ul className="mt-4 space-y-2 text-sm muted">{expressions.map((item) => <li key={item}><code>{item}</code></li>)}</ul></article>
      </div>
      <article className="panel mt-6 p-6"><h2 className="text-xl font-semibold">Available training tables</h2><p className="mt-2 text-sm leading-6 muted">SigninLogs, DeviceProcessEvents, DeviceNetworkEvents, IdentityAuditEvents, SecurityEvent, CloudAuditEvents, and UnifiedSecurityEvents. Sentinel and Defender XDR use the same underlying event IDs for correlation.</p></article>
    </section>
  );
}
