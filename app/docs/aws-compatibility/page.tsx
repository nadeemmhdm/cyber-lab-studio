import type { Metadata } from "next";
import Link from "next/link";
import { AWS_COMPATIBILITY } from "@/lib/simulators/aws/compatibility";

export const metadata: Metadata = { title: "AWS Compatibility" };

export default function AwsCompatibilityPage() {
  return (
    <section className="shell py-10 sm:py-14">
      <Link href="/docs" className="text-link text-sm">← Documentation</Link>
      <p className="eyebrow mt-5">Native simulator</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">AWS CLI compatibility</h1>
      <p className="mt-3 max-w-3xl leading-7 muted">CyberLab implements a tested training subset, not full AWS API compatibility. Unsupported operations return an explicit <code>UnsupportedOperation</code> error and are never forwarded to real AWS.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead style={{ background: "var(--surface-strong)" }}><tr><th className="p-3">Service</th><th className="p-3">Command</th><th className="p-3">Arguments</th><th className="p-3">Support</th><th className="p-3">Test</th></tr></thead>
          <tbody>{AWS_COMPATIBILITY.map((entry) => <tr key={`${entry.service}.${entry.command}`} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-3 font-semibold">{entry.service}</td><td className="p-3 font-mono">{entry.command}</td><td className="p-3 font-mono text-xs muted">{entry.arguments.join(" ") || "—"}</td><td className="p-3">{entry.support}</td><td className="p-3">{entry.tested ? "tested" : "not tested"}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
