"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

type Reply = { id: string; message: string; isAdminReply: boolean; createdAt: string; author: { displayName: string; email: string } };
type Ticket = { id: string; subject: string; category: string; priority: "LOW" | "NORMAL" | "HIGH"; status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"; createdAt: string; updatedAt: string; replies: Reply[] };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json() as { error?: string; ticketId?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export function SupportCenter({ initialTickets }: { initialTickets: Ticket[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Lab issue");
  const [priority, setPriority] = useState<Ticket["priority"]>("NORMAL");
  const [message, setMessage] = useState("");
  const [replyByTicket, setReplyByTicket] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "info">("info");

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      await post("/api/support", { subject, category, priority, message });
      setSubject(""); setMessage(""); setPriority("NORMAL");
      setTone("success"); setNotice("Report submitted. You can continue the conversation below when an administrator replies.");
      router.refresh();
    } catch (error) {
      setTone("error"); setNotice(error instanceof Error ? error.message : "Unable to submit report.");
    } finally { setBusy(false); }
  }

  async function reply(ticketId: string) {
    const value = (replyByTicket[ticketId] ?? "").trim();
    if (!value || busy) return;
    setBusy(true); setNotice("");
    try {
      await post(`/api/support/${ticketId}/reply`, { message: value });
      setReplyByTicket((current) => ({ ...current, [ticketId]: "" }));
      setTone("success"); setNotice("Reply sent to the support team.");
      router.refresh();
    } catch (error) {
      setTone("error"); setNotice(error instanceof Error ? error.message : "Unable to send reply.");
    } finally { setBusy(false); }
  }

  return <div className="space-y-8">
    <section className="panel p-6">
      <p className="eyebrow">Report an issue</p>
      <h2 className="mt-2 text-2xl font-semibold">Contact platform support</h2>
      <p className="mt-2 text-sm leading-6 muted">Report lab, account, access, content, or platform issues. Your report and administrator replies remain visible only to your account and platform administrators.</p>
      <form onSubmit={createTicket} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm">Subject<input className="input" required minLength={4} maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Example: Lab 08 validation does not pass" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">Category<select className="input" value={category} onChange={(event) => setCategory(event.target.value)}><option>Lab issue</option><option>Account</option><option>Access</option><option>Content</option><option>Performance</option><option>Other</option></select></label>
          <label className="grid gap-2 text-sm">Priority<select className="input" value={priority} onChange={(event) => setPriority(event.target.value as Ticket["priority"])}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option></select></label>
        </div>
        <label className="grid gap-2 text-sm">Details<textarea className="input min-h-32" required minLength={10} maxLength={8000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What happened, which lab/page, what you expected, and any error message." /></label>
        <button className="button-primary w-fit" disabled={busy}>{busy ? "Submitting…" : "Submit report"}</button>
      </form>
    </section>

    <section className="space-y-4">
      <div><p className="eyebrow">Your reports</p><h2 className="mt-2 text-2xl font-semibold">Support conversations</h2></div>
      {initialTickets.length === 0 ? <div className="panel p-6 text-sm muted">No support reports yet.</div> : initialTickets.map((ticket) => <article key={ticket.id} className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border)" }}>{ticket.status.replaceAll("_", " ")}</span><span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border)" }}>{ticket.category}</span><span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border)" }}>{ticket.priority}</span></div><h3 className="mt-3 text-lg font-semibold">{ticket.subject}</h3><p className="mt-1 text-xs muted">Opened {new Date(ticket.createdAt).toLocaleString()}</p></div><code className="text-xs muted">{ticket.id.slice(0, 10)}</code></div>
        <div className="mt-5 space-y-3">{ticket.replies.map((reply) => <div key={reply.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: reply.isAdminReply ? "var(--accent-soft)" : "var(--surface-strong)" }}><div className="flex items-center justify-between gap-3 text-xs"><strong>{reply.isAdminReply ? "Administrator" : "You"}</strong><span className="muted">{new Date(reply.createdAt).toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply.message}</p></div>)}</div>
        {ticket.status !== "CLOSED" ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><textarea className="input min-h-20 flex-1" maxLength={8000} value={replyByTicket[ticket.id] ?? ""} onChange={(event) => setReplyByTicket((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="Reply to support…" /><button className="button-secondary self-start" disabled={busy || !(replyByTicket[ticket.id] ?? "").trim()} onClick={() => reply(ticket.id)}>Send reply</button></div> : <p className="mt-4 text-sm muted">This conversation is closed. Create a new report for a new issue.</p>}
      </article>)}
    </section>
    <FeedbackToast message={notice} tone={tone} />
  </div>;
}
