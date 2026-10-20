"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

type Attachment = { id: string; fileName: string; mimeType: string; sizeBytes: number };
type Message = { id: string; message: string; createdAt: string; author: { id: string; displayName: string; username: string | null; roles: { role: { key: string } }[] }; attachments: Attachment[] };

async function captureDisplay(): Promise<File> {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen capture is unavailable. Upload a screenshot instead.");
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  try {
    const video = document.createElement("video"); video.srcObject = stream; video.muted = true; video.playsInline = true; await video.play();
    const scale = Math.min(1, 1600 / Math.max(1, video.videoWidth));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Could not capture screen."); ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78)); if (!blob) throw new Error("Could not encode screenshot.");
    if (blob.size > 2 * 1024 * 1024) throw new Error("Captured image is larger than 2 MB.");
    return new File([blob], `cyberlab-doubt-${Date.now()}.jpg`, { type: "image/jpeg" });
  } finally { stream.getTracks().forEach((track) => track.stop()); }
}

export function DoubtThread({ threadId, currentUserId, initialStatus, messages }: { threadId: string; currentUserId: string; initialStatus: "OPEN" | "ANSWERED" | "CLOSED"; messages: Message[] }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [text, setText] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  useEffect(() => { if (!screenshot) { setPreview(""); return; } const url = URL.createObjectURL(screenshot); setPreview(url); return () => URL.revokeObjectURL(url); }, [screenshot]);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setTone("error"); setFeedback("Screenshot must be PNG/JPEG/WebP and under 2 MB."); return; }
    setScreenshot(file);
  }

  async function capture() { setBusy(true); try { setScreenshot(await captureDisplay()); setTone("success"); setFeedback("Screenshot captured."); } catch (error) { setTone("error"); setFeedback(error instanceof Error ? error.message : "Capture failed."); } finally { setBusy(false); } }

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFeedback("");
    try {
      const form = new FormData(); form.set("message", text); if (screenshot) form.set("screenshot", screenshot);
      const response = await fetch(`/api/doubts/${threadId}/messages`, { method: "POST", body: form }); const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Reply failed.");
      setText(""); setScreenshot(null); setTone("success"); setFeedback("Reply sent."); router.refresh();
    } catch (error) { setTone("error"); setFeedback(error instanceof Error ? error.message : "Reply failed."); }
    finally { setBusy(false); }
  }

  async function changeStatus(next: "OPEN" | "ANSWERED" | "CLOSED") {
    setBusy(true); try { const response = await fetch(`/api/doubts/${threadId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) }); const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error ?? "Status update failed."); setStatus(next); setTone("success"); setFeedback(`Conversation marked ${next.toLowerCase()}.`); router.refresh(); } catch (error) { setTone("error"); setFeedback(error instanceof Error ? error.message : "Status update failed."); } finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="status-pill">{status}</span><div className="flex gap-2"><button className="button-secondary" type="button" disabled={busy || status === "CLOSED"} onClick={() => changeStatus("ANSWERED")}>Mark answered</button><button className="button-secondary" type="button" disabled={busy || status === "CLOSED"} onClick={() => changeStatus("CLOSED")}>Close</button></div></div>
    <div className="space-y-4">{messages.map((entry) => { const mine = entry.author.id === currentUserId; const role = entry.author.roles.map((item) => item.role.key).join(", "); return <article key={entry.id} className={`max-w-[90%] rounded-2xl border p-4 ${mine ? "ml-auto" : "mr-auto"}`} style={{ borderColor: "var(--border)", background: mine ? "var(--accent-soft)" : "var(--surface-strong)" }}><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{entry.author.username ?? entry.author.displayName}</strong><span className="text-xs muted">{role} · {new Date(entry.createdAt).toLocaleString()}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{entry.message}</p>{entry.attachments.map((attachment) => <a key={attachment.id} href={`/api/doubts/${threadId}/attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}><img src={`/api/doubts/${threadId}/attachments/${attachment.id}`} alt={attachment.fileName} className="max-h-96 w-full object-contain" /><span className="block p-2 text-xs muted">{attachment.fileName} · {(attachment.sizeBytes / 1024).toFixed(0)} KB</span></a>)}</article>; })}</div>
    {status !== "CLOSED" ? <form className="panel p-5" onSubmit={reply}><label className="field-label">Continue conversation<textarea className="field-input min-h-28" value={text} onChange={(event) => setText(event.target.value)} minLength={2} maxLength={6000} required /></label><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="button-secondary flex items-center justify-center gap-2" type="button" onClick={capture} disabled={busy}><Camera size={16} />Capture screen</button><label className="button-secondary flex cursor-pointer items-center justify-center gap-2"><ImagePlus size={16} />Upload screenshot<input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={choose} /></label></div>{preview ? <div className="mt-3"><img src={preview} alt="Reply screenshot preview" className="max-h-64 w-full rounded-xl object-contain" /><button className="text-link mt-2 text-sm" type="button" onClick={() => setScreenshot(null)}>Remove screenshot</button></div> : null}<button className="button-primary mt-4 w-full" type="submit" disabled={busy || text.trim().length < 2}>{busy ? "Sending…" : "Send reply"}</button></form> : <div className="panel p-5 text-sm muted">This doubt conversation is closed.</div>}
    <FeedbackToast message={feedback} tone={tone} />
  </div>;
}
