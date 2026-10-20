"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  status: Status;
  createdAt: string;
  updatedAt: string;
  user: { id: string; displayName: string; email: string; suspended: boolean; roles: string[] };
  replies: { id: string; message: string; isAdminReply: boolean; createdAt: string; author: { id: string; displayName: string; email: string } }[];
};

async function mutate(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json() as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Support update failed.");
}

export function AdminSupportDesk({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const [reply, setReply] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "info">("info");

  async function run(action: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true); setNotice("");
    try { await action(); setTone("success"); setNotice(success); router.refresh(); }
    catch (error) { setTone("error"); setNotice(error instanceof Error ? error.message : "Support update failed."); }
    finally { setBusy(false); }
  }

  return <section className="panel p-6">
    <p className="eyebrow">Support desk</p>
    <h2 className="mt-2 text-2xl font-semibold">User reports and administrator replies</h2>
    <p className="mt-2 text-sm leading-6 muted">Review who reported an issue, inspect the complete conversation, reply as an administrator, and move the ticket through its support lifecycle.</p>
    <div className="mt-5 space-y-3">
      {tickets.length === 0 ? <p className="text-sm muted">No support reports.</p> : tickets.map((ticket) => <details key={ticket.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><strong>{ticket.subject}</strong><p className="mt-1 text-xs muted">{ticket.user.displayName} · {ticket.user.email} · {ticket.category} · {ticket.priority}</p></div><span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "var(--border)" }}>{ticket.status.replaceAll("_", " ")}</span></div>
        </summary>
        <div className="mt-4 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}><strong>Reporter account</strong><div className="mt-2 grid gap-1 muted"><span>User ID: <code>{ticket.user.id}</code></span><span>Roles: {ticket.user.roles.join(", ") || "none"}</span><span>Status: {ticket.user.suspended ? "Suspended" : "Active"}</span><span>Opened: {new Date(ticket.createdAt).toLocaleString()}</span></div></div>
        <div className="mt-4 space-y-3">{ticket.replies.map((item) => <div key={item.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: item.isAdminReply ? "var(--accent-soft)" : "var(--surface-strong)" }}><div className="flex items-center justify-between gap-3 text-xs"><strong>{item.isAdminReply ? "Administrator" : item.author.displayName}</strong><span className="muted">{new Date(item.createdAt).toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.message}</p></div>)}</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[180px_1fr_auto]">
          <select className="input" value={ticket.status} disabled={busy} onChange={(event) => run(() => mutate(`/api/admin/support/${ticket.id}`, "PATCH", { status: event.target.value }), "Ticket status updated.")}>{(["OPEN","IN_PROGRESS","RESOLVED","CLOSED"] as Status[]).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select>
          <textarea className="input min-h-20" maxLength={8000} value={reply[ticket.id] ?? ""} onChange={(event) => setReply((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="Reply to this user…" />
          <button className="button-primary self-start" disabled={busy || !(reply[ticket.id] ?? "").trim()} onClick={() => run(async () => { await mutate(`/api/admin/support/${ticket.id}`, "POST", { message: reply[ticket.id] }); setReply((current) => ({ ...current, [ticket.id]: "" })); }, "Administrator reply sent.")}>Reply</button>
        </div>
      </details>)}
    </div>
    <FeedbackToast message={notice} tone={tone} />
  </section>;
}
