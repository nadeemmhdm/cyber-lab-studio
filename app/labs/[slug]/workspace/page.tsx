import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AwsTerminal } from "@/components/labs/aws-terminal";
import { AzureTerminal } from "@/components/labs/azure-terminal";
import { EducationalGuidance } from "@/components/labs/educational-guidance";
import { KqlConsole } from "@/components/labs/kql-console";
import { LabWorkspaceControls } from "@/components/labs/lab-workspace-controls";
import { SecurityActions } from "@/components/labs/security-actions";
import { requireUser } from "@/lib/auth/session";
import { getWorkspace, LabEngineError } from "@/lib/labs/engine";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Lab workspace" };

export default async function LabWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireUser();
  const { slug } = await params;
  let workspace;
  try {
    workspace = await getWorkspace(session.user.id, slug);
  } catch (error) {
    if (error instanceof LabEngineError && error.status === 404) notFound();
    throw error;
  }
  if (!workspace) redirect(`/labs/${slug}`);

  const progress = workspace.progress;
  const state = JSON.stringify(workspace.environment.environmentState, null, 2);
  const hasTerminal = workspace.lab.platform === "AWS" || workspace.lab.platform === "AZURE";
  const hasKql = workspace.lab.platform === "SENTINEL" || workspace.lab.platform === "KQL" || workspace.lab.platform === "DEFENDER_XDR";
  const [terminalHistory, completion] = await Promise.all([
    hasTerminal ? prisma.terminalHistory.findMany({ where: { userId: session.user.id, environmentId: workspace.environment.id }, orderBy: { createdAt: "desc" }, take: 12 }) : Promise.resolve([]),
    prisma.completionRecord.findUnique({ where: { userId_labId: { userId: session.user.id, labId: workspace.lab.id } }, include: { flag: true } }),
  ]);
  const initialTerminal = terminalHistory.reverse().map((item) => ({ command: item.command, exitCode: item.exitCode, output: item.outputSummary ?? "" }));
  const initialQuery = workspace.lab.platform === "SENTINEL"
    ? 'SigninLogs | where RiskLevel == "high" | project TimeGenerated, UserPrincipalName, IPAddress, ResultType | sort by TimeGenerated asc'
    : workspace.lab.platform === "DEFENDER_XDR"
      ? 'UnifiedSecurityEvents | where Severity == "High" or Severity == "Critical" | sort by TimeGenerated asc'
      : 'DeviceProcessEvents | where ProcessCommandLine contains "powershell" | project TimeGenerated, DeviceName, AccountName, ProcessCommandLine';

  return (
    <section className="shell py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={`/labs/${slug}`} className="text-link text-sm">← Lab overview</Link>
          <p className="eyebrow mt-5">Isolated student workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Lab {String(workspace.lab.number).padStart(2, "0")}: {workspace.lab.title}</h1>
          <p className="mt-3 muted">Version {workspace.version.version} · {workspace.attempt?.mode ?? "GUIDED"} mode · Reset #{workspace.environment.resetCount}</p>
        </div>
        <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}><span className="muted">Verified progress</span><strong className="ml-2">{completion ? 100 : progress?.completionPct ?? 0}%</strong></div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          {workspace.policy.showConcepts ? <article className="glass rounded-3xl p-6"><h2 className="text-xl font-semibold">Concept & scenario</h2><p className="mt-3 leading-7 muted">{workspace.version.conceptExplanation}</p><p className="mt-4 leading-7 muted">{workspace.version.scenario}</p></article> : <article className="rounded-3xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}><h2 className="font-semibold">Challenge mode</h2><p className="mt-2 text-sm muted">Concept guidance, hints, and solutions are hidden by the mode policy.</p></article>}

          <EducationalGuidance
            hints={workspace.version.hints.map((hint) => ({ level: hint.level, content: hint.content }))}
            solution={workspace.version.solution}
            showHints={workspace.policy.showHints}
            showSolution={workspace.policy.showSolution}
          />

          {workspace.lab.platform === "AWS" ? <div><div className="mb-3 flex items-center justify-between gap-3"><div><p className="eyebrow">Native simulator</p><h2 className="mt-1 text-xl font-semibold">AWS CLI</h2></div><Link href="/docs/aws-compatibility" className="text-link text-sm">Supported commands</Link></div><AwsTerminal slug={slug} initialHistory={initialTerminal} /></div> : null}
          {workspace.lab.platform === "AZURE" ? <div><div className="mb-3 flex items-center justify-between gap-3"><div><p className="eyebrow">Native simulator</p><h2 className="mt-1 text-xl font-semibold">Azure CLI</h2></div><Link href="/docs/azure-compatibility" className="text-link text-sm">Supported commands</Link></div><AzureTerminal slug={slug} initialHistory={initialTerminal} /></div> : null}
          {hasKql ? <div><div className="mb-3 flex items-center justify-between gap-3"><div><p className="eyebrow">Security data engine</p><h2 className="mt-1 text-xl font-semibold">KQL query console</h2></div><Link href="/docs/kql-compatibility" className="text-link text-sm">Supported KQL</Link></div><KqlConsole slug={slug} initialQuery={initialQuery} /></div> : null}
          {workspace.lab.platform === "SENTINEL" || workspace.lab.platform === "DEFENDER_XDR" ? <SecurityActions slug={slug} platform={workspace.lab.platform} /> : null}

          <article className="rounded-3xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Persisted simulator state</h2><span className="text-xs muted">SQLite-backed</span></div><pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl border p-4 text-xs leading-6" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>{state}</pre></article>
        </div>

        <aside className="glass h-fit rounded-3xl p-5 sm:p-6"><h2 className="text-xl font-semibold">Tasks & validation</h2><p className="mt-2 text-sm leading-6 muted">Task buttons record workflow only. Completion, achievements, and flags are issued only after server-side evidence validation.</p><div className="mt-5"><LabWorkspaceControls slug={slug} tasks={workspace.version.tasks.map((task) => ({ id: task.id, position: task.position, title: task.title, instruction: task.instruction }))} lastTaskPosition={progress?.lastTaskPosition ?? 0} completed={Boolean(completion)} existingFlag={completion?.flag?.value ?? null} /></div></aside>
      </div>
    </section>
  );
}
