"use client";

import { LearningMode } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

export function LabStartControls({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<LearningMode>(LearningMode.GUIDED);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function start() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/labs/${slug}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to start lab.");
      router.push(`/labs/${slug}/workspace`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start lab.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="field-label">Learning mode
        <select className="field-input" value={mode} onChange={(event) => setMode(event.target.value as LearningMode)}>
          <option value={LearningMode.GUIDED}>Guided — concepts, hints, solution access</option>
          <option value={LearningMode.PRACTICE}>Practice — objectives first, help on demand</option>
          <option value={LearningMode.CHALLENGE}>Challenge — hints and solution hidden</option>
        </select>
      </label>
      <button type="button" className="button-primary w-full" onClick={start} disabled={busy}>{busy ? "Starting…" : signedIn ? "Start / Resume lab" : "Sign in to start"}</button>
      <FeedbackToast message={message} tone="error" />
    </div>
  );
}
