"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

export function LabWorkspaceControls({ slug, tasks, lastTaskPosition }: { slug: string; tasks: { id: string; position: number; title: string; instruction: string }[]; lastTaskPosition: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "info">("info");

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

  async function reset() {
    if (!window.confirm("Reset this lab to its deterministic starting state? Your simulator changes will be discarded.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/labs/${slug}/reset`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not reset the lab.");
      setTone("success");
      setMessage("Environment reset to the published version's initial state.");
      router.refresh();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not reset the lab.");
    } finally {
      setBusy(false);
    }
  }

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
              <button className="button-secondary mt-4" type="button" disabled={busy || saved} onClick={() => markTask(task.position)}>{saved ? "Progress saved" : "Mark progress"}</button>
            </div>
          );
        })}
      </div>
      <button className="button-secondary w-full" type="button" onClick={reset} disabled={busy}>Reset environment</button>
      <FeedbackToast message={message} tone={tone} />
    </div>
  );
}
