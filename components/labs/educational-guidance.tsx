type Hint = { level: number; content: string };
type SolutionCommand = { command: string; purpose: string; explanation: string };
type Solution = {
  problem: string;
  concept: string;
  uiNavigation: string;
  commands: unknown;
  expectedOutput: string;
  whyItWorks: string;
  securityConsequence: string;
  verification: string;
  commonMistakes: string;
  troubleshooting: string;
  summary: string;
};

function parseCommands(value: unknown): SolutionCommand[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is SolutionCommand => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Record<string, unknown>;
    return typeof candidate.command === "string" && typeof candidate.purpose === "string" && typeof candidate.explanation === "string";
  });
}

export function EducationalGuidance({ hints, solution, showHints, showSolution }: { hints: Hint[]; solution: Solution | null; showHints: boolean; showSolution: boolean }) {
  const commands = solution ? parseCommands(solution.commands) : [];
  if (!showHints && !showSolution) return null;

  return (
    <div className="space-y-6">
      {showHints && hints.length > 0 ? (
        <section className="rounded-3xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div>
            <p className="eyebrow">Progressive guidance</p>
            <h2 className="mt-1 text-xl font-semibold">Hints</h2>
            <p className="mt-2 text-sm leading-6 muted">Open only the level you need. Hints guide the investigation but never expose flags or server validator internals.</p>
          </div>
          <div className="mt-5 space-y-3">
            {hints.map((hint) => (
              <details key={hint.level} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
                <summary className="cursor-pointer font-semibold">Hint level {hint.level}</summary>
                <p className="mt-3 text-sm leading-6 muted">{hint.content}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {showSolution && solution ? (
        <section className="rounded-3xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="eyebrow">Educational walkthrough</p>
          <h2 className="mt-1 text-xl font-semibold">Complete solution</h2>
          <p className="mt-2 text-sm leading-6 muted">Use this after attempting the lab. The walkthrough explains the reasoning and verification path; it does not grant completion or reveal a flag.</p>

          <div className="mt-5 space-y-3">
            <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
              <summary className="cursor-pointer font-semibold">Problem and concept</summary>
              <div className="mt-3 space-y-3 text-sm leading-6 muted"><p>{solution.problem}</p><p>{solution.concept}</p></div>
            </details>

            <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
              <summary className="cursor-pointer font-semibold">Workspace path</summary>
              <p className="mt-3 text-sm leading-6 muted">{solution.uiNavigation}</p>
            </details>

            <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }} open>
              <summary className="cursor-pointer font-semibold">Commands and queries explained</summary>
              <div className="mt-4 space-y-4">
                {commands.map((entry, index) => (
                  <article key={`${index}-${entry.command}`} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] muted">Step {index + 1} · {entry.purpose}</p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border p-3 text-xs leading-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>{entry.command}</pre>
                    <p className="mt-3 text-sm leading-6 muted">{entry.explanation}</p>
                  </article>
                ))}
              </div>
            </details>

            <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
              <summary className="cursor-pointer font-semibold">Expected output and verification</summary>
              <div className="mt-3 space-y-3 text-sm leading-6 muted"><p><strong className="text-[var(--foreground)]">Expected:</strong> {solution.expectedOutput}</p><p><strong className="text-[var(--foreground)]">Verify:</strong> {solution.verification}</p><p>{solution.whyItWorks}</p></div>
            </details>

            <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
              <summary className="cursor-pointer font-semibold">Security consequence</summary>
              <p className="mt-3 text-sm leading-6 muted">{solution.securityConsequence}</p>
            </details>

            <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
              <summary className="cursor-pointer font-semibold">Common mistakes</summary>
              <p className="mt-3 text-sm leading-6 muted">{solution.commonMistakes}</p>
            </details>

            <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
              <summary className="cursor-pointer font-semibold">Troubleshooting</summary>
              <p className="mt-3 text-sm leading-6 muted">{solution.troubleshooting}</p>
            </details>

            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
              <p className="font-semibold">Summary</p>
              <p className="mt-2 text-sm leading-6 muted">{solution.summary}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
