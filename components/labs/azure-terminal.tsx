"use client";

import { useState, type FormEvent } from "react";

type Entry = { command: string; exitCode: number; output: unknown };

function renderOutput(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function AzureTerminal({ slug, initialHistory = [] }: { slug: string; initialHistory?: Entry[] }) {
  const [command, setCommand] = useState("az account show");
  const [entries, setEntries] = useState<Entry[]>(initialHistory);
  const [busy, setBusy] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = command.trim();
    if (!current || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/labs/${slug}/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: current }),
      });
      const data = (await response.json()) as { exitCode?: number; output?: unknown; error?: string | { code: string; message: string } };
      if (!response.ok) setEntries((items) => [...items, { command: current, exitCode: response.status, output: typeof data.error === "string" ? data.error : "Request failed." }]);
      else setEntries((items) => [...items, { command: current, exitCode: data.exitCode ?? 0, output: data.output }]);
      setCommand("");
    } catch (error) {
      setEntries((items) => [...items, { command: current, exitCode: 1, output: error instanceof Error ? error.message : "Network error" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border" style={{ borderColor: "var(--border)", background: "#07101d", color: "#d9eeff" }}>
      <div className="flex items-center justify-between border-b px-4 py-3 text-xs" style={{ borderColor: "#19324d" }}>
        <span className="font-semibold uppercase tracking-[0.16em]">CyberLab Azure CLI</span>
        <span style={{ color: "#89a4bf" }}>simulator · no host shell</span>
      </div>
      <div className="max-h-[520px] min-h-[260px] overflow-auto p-4 font-mono text-xs leading-6" aria-live="polite">
        {entries.length === 0 ? <p style={{ color: "#89a4bf" }}>Try: az account show</p> : null}
        {entries.map((entry, index) => <div key={`${entry.command}-${index}`} className="mb-5"><div><span style={{ color: "#72b7ff" }}>$</span> {entry.command}</div><pre className="mt-1 whitespace-pre-wrap break-words" style={{ color: entry.exitCode === 0 ? "#d9eeff" : "#ff9b9b" }}>{renderOutput(entry.output)}</pre></div>)}
      </div>
      <form onSubmit={run} className="flex gap-2 border-t p-3" style={{ borderColor: "#19324d" }}>
        <span className="self-center font-mono text-sm" style={{ color: "#72b7ff" }}>$</span>
        <input value={command} onChange={(event) => setCommand(event.target.value)} className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none" placeholder="az resource list" aria-label="Azure CLI command" autoComplete="off" />
        <button type="submit" className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "#113b66", color: "#a9d6ff" }} disabled={busy}>{busy ? "Running…" : "Run"}</button>
      </form>
    </section>
  );
}
