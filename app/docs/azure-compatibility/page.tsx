import type { Metadata } from "next";
import Link from "next/link";
import { AZURE_COMPATIBILITY } from "@/lib/simulators/azure/engine";

export const metadata: Metadata = { title: "Azure Compatibility" };

export default function AzureCompatibilityPage() {
  return (
    <section className="shell py-10 sm:py-14">
      <Link href="/docs" className="text-link text-sm">← Documentation</Link>
      <p className="eyebrow mt-5">Native simulator</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Azure CLI compatibility</h1>
      <p className="mt-3 max-w-3xl leading-7 muted">CyberLab implements a deterministic training subset of Azure CLI. It does not contact Azure. Unsupported operations return <code>UnsupportedOperation</code>; state-changing commands mutate only the authenticated learner&apos;s SQLite-backed lab environment.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead style={{ background: "var(--surface-strong)" }}><tr><th className="p-3">Command</th><th className="p-3">Support</th><th className="p-3">Execution model</th></tr></thead>
          <tbody>{AZURE_COMPATIBILITY.map((entry) => <tr key={entry.command} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-3 font-mono text-xs">{entry.command}</td><td className="p-3">{entry.status}</td><td className="p-3 muted">Native CyberLab state</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
