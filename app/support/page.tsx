import type { Metadata } from "next";
import { SupportCenter } from "@/components/support/support-center";
import { requireUser } from "@/lib/auth/session";
import { listUserTickets } from "@/lib/support/service";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const session = await requireUser();
  const tickets = await listUserTickets(session.user.id);
  const initialTickets = tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    replies: ticket.replies.map((reply) => ({
      id: reply.id,
      message: reply.message,
      isAdminReply: reply.isAdminReply,
      createdAt: reply.createdAt.toISOString(),
      author: reply.author,
    })),
  }));

  return <section className="shell py-10 sm:py-14">
    <p className="eyebrow">Help & support</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-tight">Report issues and follow replies</h1>
    <p className="mt-3 max-w-3xl muted">Send a report directly to platform administrators and keep the complete conversation attached to your account.</p>
    <div className="mt-8"><SupportCenter initialTickets={initialTickets} /></div>
  </section>;
}
