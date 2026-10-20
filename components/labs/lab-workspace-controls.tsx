"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

type ValidationResponse = {
  error?: string;
  passed?: boolean;
  completed?: boolean;
  flag?: string;
  feedback?: { label: string; passed: boolean }[];
  achievements?: { key: string; name: string }[];
};

export function LabWorkspaceControls({
  slug,
  tasks,
  lastTaskPosition,
  completed,
  existingFlag,
}: {
  slug: string;
  tasks: { id: string; position: number; title: string; instruction: string }[];
  lastTaskPosition: number;
  completed: boolean;
  existingFlag?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "info">("info");
  const [validation, setValidation] = useState<ValidationResponse | null>(existingFlag ? { passed: true, completed: true, flag: existingFlag } : null);

  async function markTask(position: number) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/labs/${slug}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update task progress.");
      setTone("success");
      setMessage("Task progress saved to your isolated lab state.");
      router.refresh();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not update task progress.");
    } finally {
      setBusy(false);
    }
  }

  async function validateLab() {
    setBusy(true);
    setMessage("");
    setValidation(null);
    try {
      const response = await fetch(`/api/labs/${slug}/validate`, { method: "POST" });
      const data = (await response.json()) as ValidationResponse;
      setValidation(data);
      if (!response.ok) {
        setTone("error");
        setMessage(data.error ?? "Server validation did not pass yet. Review the checks below and continue the lab.");
        return;
      }
      setTone("success");
      const awardText = data.achievements?.length ? ` Achievement earned: ${data.achievements.map((item) => item.name).join(", ")}.` : "";
      setMessage(`Lab validated. Completion and flag were issued transactionally.${awardText}`);
      router.refresh();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not validate the lab.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm("Reset this lab to its deterministic starting state? Your simulator changes and task progress will be discarded.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/labs/${slug}/reset`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not reset the lab.");
      setTone("success");
      setMessage("Environment reset to the published version's deterministic initial state.");
      router.refresh();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not reset the lab.");
    } finally {
      setBusy(false);
    }
  }

  const taskWorkflowReady = tasks.length > 0 && lastTaskPosition >= tasks.length;
  const verified = completed || Boolean(validation?.completed);
  const flag = validation?.flag ?? existingFlag;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {tasks.map((task) => {
          const saved = task.position <= lastTaskPosition;
          return (
            <div key={task.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>Task {task.position}</p>
                  <h3 className="mt-1 font-semibold">{task.title}</h3>
                  <p className="mt-2 text-sm leading-6 muted">{task.instruction}</p>
                </div>
                <span className="rounded-lg border px-2.5 py-1 text-xs" style={{ borderColor: "var(--border)" }}>{saved ? "Saved" : "Pending"}</span>
              </div>
              <button className="button-secondary mt-4" type="button" disabled={busy || saved || verified} onClick={() => markTask(task.position)}>{saved ? "Progress saved" : "Mark progress"}</button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Server validation</h3><span className="text-xs muted">{verified ? "Verified" : "Required"}</span></div>
        <p className="mt-2 text-sm leading-6 muted">Completion reaches 100% only after the server verifies persisted lab evidence. A successful command response or task button alone cannot issue a flag.</p>
        <button className="button-primary mt-4 w-full" type="button" onClick={validateLab} disabled={busy || verified || !taskWorkflowReady}>{verified ? "Lab verified" : taskWorkflowReady ? "Validate lab" : "Complete all tasks first"}</button>
        {validation?.feedback?.length ? <div className="mt-4 grid gap-2">{validation.feedback.map((check) => <div key={check.label} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}><span>{check.label}</span><strong>{check.passed ? "Pass" : "Not yet"}</strong></div>)}</div> : null}
        {flag ? <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><p className="text-xs font-semibold uppercase tracking-[0.14em] muted">Completion flag</p><code className="mt-2 block break-all text-sm">{flag}</code></div> : null}
      </div>

      <button className="button-secondary w-full" type="button" onClick={reset} disabled={busy || verified}>{verified ? "Verified lab locked" : "Reset environment"}</button>
      <FeedbackToast message={message} tone={tone} />
    </div>
  );
}
