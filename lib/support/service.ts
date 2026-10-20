import { Prisma, RoleType, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class SupportError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "SupportError";
  }
}

function clean(value: string, max: number) {
  return value.trim().replace(/\r\n/g, "\n").slice(0, max);
}

async function writeAudit(tx: Prisma.TransactionClient, actorId: string, action: string, ticketId: string, metadata?: Prisma.InputJsonValue) {
  await tx.auditLog.create({ data: { actorId, action, targetType: "SupportTicket", targetId: ticketId, ...(metadata ? { metadata } : {}) } });
}

export async function createSupportTicket(userId: string, input: { subject: string; category: string; priority?: SupportTicketPriority; message: string }) {
  const subject = clean(input.subject, 160);
  const category = clean(input.category, 80) || "General";
  const message = clean(input.message, 8000);
  if (subject.length < 4) throw new SupportError("SUBJECT_REQUIRED", "Add a short subject for the report.");
  if (message.length < 10) throw new SupportError("MESSAGE_REQUIRED", "Describe the issue in a little more detail.");

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({ data: { userId, subject, category, priority: input.priority ?? SupportTicketPriority.NORMAL } });
    await tx.supportReply.create({ data: { ticketId: ticket.id, authorId: userId, message, isAdminReply: false } });
    await writeAudit(tx, userId, "support.ticket.created", ticket.id, { category, priority: ticket.priority });
    return ticket;
  });
}

export async function listUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { displayName: true, email: true } } } } },
  });
}

export async function addUserSupportReply(userId: string, ticketId: string, rawMessage: string) {
  const message = clean(rawMessage, 8000);
  if (message.length < 2) throw new SupportError("MESSAGE_REQUIRED", "Reply cannot be empty.");
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findFirst({ where: { id: ticketId, userId } });
    if (!ticket) throw new SupportError("TICKET_NOT_FOUND", "Support ticket not found.", 404);
    if (ticket.status === SupportTicketStatus.CLOSED) throw new SupportError("TICKET_CLOSED", "This ticket is closed. Create a new report if you need more help.", 409);
    const reply = await tx.supportReply.create({ data: { ticketId, authorId: userId, message, isAdminReply: false } });
    if (ticket.status === SupportTicketStatus.RESOLVED) await tx.supportTicket.update({ where: { id: ticketId }, data: { status: SupportTicketStatus.OPEN } });
    else await tx.supportTicket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
    await writeAudit(tx, userId, "support.ticket.user_replied", ticketId);
    return reply;
  });
}

export async function listAdminSupportTickets() {
  return prisma.supportTicket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    include: {
      user: { select: { id: true, displayName: true, email: true, suspendedAt: true, roles: { include: { role: true } } } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, displayName: true, email: true } } } },
    },
  });
}

export async function addAdminSupportReply(adminId: string, ticketId: string, rawMessage: string) {
  const message = clean(rawMessage, 8000);
  if (message.length < 2) throw new SupportError("MESSAGE_REQUIRED", "Reply cannot be empty.");
  return prisma.$transaction(async (tx) => {
    const admin = await tx.user.findUnique({ where: { id: adminId }, include: { roles: { include: { role: true } } } });
    if (!admin?.roles.some((entry) => entry.role.key === RoleType.ADMIN)) throw new SupportError("ADMIN_REQUIRED", "Administrator role required.", 403);
    const ticket = await tx.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new SupportError("TICKET_NOT_FOUND", "Support ticket not found.", 404);
    const reply = await tx.supportReply.create({ data: { ticketId, authorId: adminId, message, isAdminReply: true } });
    if (ticket.status === SupportTicketStatus.OPEN) await tx.supportTicket.update({ where: { id: ticketId }, data: { status: SupportTicketStatus.IN_PROGRESS } });
    else await tx.supportTicket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
    await writeAudit(tx, adminId, "support.ticket.admin_replied", ticketId, { requesterId: ticket.userId });
    return reply;
  });
}

export async function updateSupportTicketStatus(adminId: string, ticketId: string, status: SupportTicketStatus) {
  return prisma.$transaction(async (tx) => {
    const admin = await tx.user.findUnique({ where: { id: adminId }, include: { roles: { include: { role: true } } } });
    if (!admin?.roles.some((entry) => entry.role.key === RoleType.ADMIN)) throw new SupportError("ADMIN_REQUIRED", "Administrator role required.", 403);
    const ticket = await tx.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new SupportError("TICKET_NOT_FOUND", "Support ticket not found.", 404);
    const updated = await tx.supportTicket.update({ where: { id: ticketId }, data: { status } });
    await writeAudit(tx, adminId, "support.ticket.status_updated", ticketId, { status });
    return updated;
  });
}
