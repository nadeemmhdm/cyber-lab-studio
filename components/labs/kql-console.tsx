"use client";

import { useState, type FormEvent } from "react";

type QueryEntry = { query: string; rowCount: number; output: unknown; error?: string };

export function KqlConsole({ slug, initialQuery = "UnifiedSecurityEvents | take 10", initialHistory = [] }: { slug: string; initialQuery?: string; initialHistory?: QueryEntry[] }) {
  const [query, setQuery] = useState(initialQuery);
  const [entries, setEntries] = useState<QueryEntry[]>(initialHistory);
  const [busy, setBusy] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = query.trim();
    if (!current || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/labs/${slug}/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: current }) });
      const data = (await response.json()) as { rows?: unknown[]; rowCount?: number; executionMs?: number; error?: string; code?: string };
      if (!response.ok) setEntries((items) => [...items, { query: current, rowCount: 0, output: null, error: `${data.code ? `${data.code}: ` : ""}${data.error ?? "Query failed."}` }]);
      else setEntries((items) => [...items, { query: current, rowCount: data.rowCount ?? 0, output: { rows: data.rows ?? [], executionMs: data.executionMs ?? 0 } }]);
    } catch (error) {
      setEntries((items) => [...items, { query: current, rowCount: 0, output: null, error: error instanceof Error ? error.message : "Network error" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border" style={{ borderColor: "var(--border)", background: "#080b14", color: "#dce8ff" }}>
      <div className="flex items-center justify-between border-b px-4 py-3 text-xs" style={{ borderColor: "#202941" }}><span className="font-semibold uppercase tracking-[0.16em]">CyberLab KQL</span><span style={{ color: "#8492ad" }}>AST evaluator · synthetic data</span></div>
      <form onSubmit={run} className="border-b p-3" style={{ borderColor: "#202941" }}>
        <textarea value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-28 w-full resize-y rounded-xl border bg-transparent p-3 font-mono text-xs leading-6 outline-none" style={{ borderColor: "#2b3654" }} aria-label="KQL query" spellCheck={false} />
        <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs" style={{ color: "#8492ad" }}>where · project · extend · summarize · distinct · top · sort · take</span><button type="submit" className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "#203a77", color: "#bfd3ff" }} disabled={busy}>{busy ? "Running…" : "Run query"}</button></div>
      </form>
      <div className="max-h-[560px] min-h-[220px] overflow-auto p-4 font-mono text-xs leading-6" aria-live="polite">
        {entries.length === 0 ? <p style={{ color: "#8492ad" }}>Run a query against the lab&apos;s stored security tables.</p> : null}
        {entries.map((entry, index) => <div key={`${entry.query}-${index}`} className="mb-6"><div style={{ color: "#8db1ff" }}>› {entry.query}</div>{entry.error ? <pre className="mt-2 whitespace-pre-wrap" style={{ color: "#ff9b9b" }}>{entry.error}</pre> : <><p className="mt-1" style={{ color: "#8492ad" }}>{entry.rowCount} row(s)</p><pre className="mt-2 whitespace-pre-wrap break-words">{JSON.stringify(entry.output, null, 2)}</pre></>}</div>)}
      </div>
    </section>
  );
}
