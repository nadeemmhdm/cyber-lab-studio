"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SecurityActions({ slug, platform }: { slug: string; platform: "SENTINEL" | "DEFENDER_XDR" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function runDetections() {
    if (platform !== "SENTINEL" || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/labs/${slug}/security`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "run-sentinel-detections" }) });
      const data = (await response.json()) as { created?: unknown[]; error?: string };
      if (!response.ok) setMessage(data.error ?? "Detection execution failed.");
      else { setMessage(`Detection run complete: ${data.created?.length ?? 0} new alert(s).`); router.refresh(); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Network error");
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">{platform === "SENTINEL" ? "Analytics rules" : "Defender XDR correlation"}</p><p className="mt-1 text-sm muted">{platform === "SENTINEL" ? "Run enabled rules against the current stored datasets and create alerts/incidents from matches." : "Alerts and the attack timeline are correlated from the shared event dataset."}</p></div>
        {platform === "SENTINEL" ? <button type="button" className="button-primary" onClick={runDetections} disabled={busy}>{busy ? "Running…" : "Run detections"}</button> : null}
      </div>
      {message ? <p className="mt-3 text-sm" aria-live="polite">{message}</p> : null}
    </div>
  );
}
