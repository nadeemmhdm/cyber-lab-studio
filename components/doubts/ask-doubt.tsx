"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, ImagePlus, MessageCircleQuestion, X } from "lucide-react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

async function captureDisplay(): Promise<File> {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen capture is not supported by this browser. Upload a screenshot instead.");
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 1 }, audio: false });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    if (!video.videoWidth || !video.videoHeight) await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve(); });
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / Math.max(1, video.videoWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not capture the selected screen.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
    if (!blob) throw new Error("Could not create screenshot image.");
    if (blob.size > MAX_IMAGE_BYTES) throw new Error("Captured screenshot is larger than 2 MB. Upload a smaller image instead.");
    return new File([blob], `cyberlab-screenshot-${Date.now()}.jpg`, { type: "image/jpeg" });
  } finally {
    for (const track of stream.getTracks()) track.stop();
  }
}

export function AskDoubt({ slug }: { slug: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  useEffect(() => {
    if (!screenshot) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(screenshot);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setTone("error"); setFeedback("Use a PNG, JPEG, or WebP screenshot."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setTone("error"); setFeedback("Screenshot must be smaller than 2 MB."); return; }
    setScreenshot(file); setFeedback("");
  }

  async function capture() {
    setBusy(true); setFeedback("");
    try { setScreenshot(await captureDisplay()); setTone("success"); setFeedback("Screenshot captured. Review it before sending."); }
    catch (error) { setTone("error"); setFeedback(error instanceof Error ? error.message : "Screen capture failed."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setFeedback("");
    try {
      const form = new FormData();
      form.set("message", message);
      if (screenshot) form.set("screenshot", screenshot);
      const response = await fetch(`/api/labs/${slug}/doubts`, { method: "POST", body: form });
      const data = await response.json() as { threadId?: string; error?: string };
      if (!response.ok || !data.threadId) throw new Error(data.error ?? "Could not send your doubt.");
      setTone("success"); setFeedback("Doubt sent to your assigned instructor.");
      setMessage(""); setScreenshot(null);
      dialogRef.current?.close();
      router.push(`/doubts/${data.threadId}`);
      router.refresh();
    } catch (error) { setTone("error"); setFeedback(error instanceof Error ? error.message : "Could not send your doubt."); }
    finally { setBusy(false); }
  }

  return <>
    <button className="button-secondary flex w-full items-center justify-center gap-2" type="button" onClick={() => dialogRef.current?.showModal()}><MessageCircleQuestion size={17} />Ask a doubt</button>
    <dialog ref={dialogRef} className="dialog-card w-[min(94vw,720px)] rounded-3xl border p-0 backdrop:bg-black/60" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <form className="p-5 sm:p-6" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Lab question</p><h2 className="mt-1 text-2xl font-semibold">Ask your instructor</h2><p className="mt-2 text-sm leading-6 muted">Describe exactly where you are stuck. Attach an uploaded screenshot or capture the screen you choose. Your instructor can continue the conversation with you.</p></div><button className="button-secondary !p-2" type="button" aria-label="Close" onClick={() => dialogRef.current?.close()}><X size={18} /></button></div>
        <label className="field-label mt-5">Your doubt<textarea className="field-input min-h-32 resize-y" value={message} onChange={(event) => setMessage(event.target.value)} minLength={2} maxLength={6000} placeholder="What did you try, what happened, and what do you expect?" required /></label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><button className="button-secondary flex items-center justify-center gap-2" type="button" onClick={capture} disabled={busy}><Camera size={17} />Capture current screen</button><label className="button-secondary flex cursor-pointer items-center justify-center gap-2"><ImagePlus size={17} />Upload screenshot<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={selectFile} /></label></div>
        {previewUrl ? <div className="mt-4 rounded-2xl border p-3" style={{ borderColor: "var(--border)" }}><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider muted">Screenshot preview · {(screenshot!.size / 1024).toFixed(0)} KB</p><button className="text-link text-sm" type="button" onClick={() => setScreenshot(null)}>Remove</button></div><img src={previewUrl} alt="Screenshot to send with doubt" className="mt-3 max-h-72 w-full rounded-xl object-contain" /></div> : null}
        <div className="mt-4"><FeedbackToast message={feedback} tone={tone} /></div>
        <button className="button-primary mt-5 w-full" type="submit" disabled={busy || message.trim().length < 2}>{busy ? "Sending…" : "Send to instructor"}</button>
      </form>
    </dialog>
  </>;
}
