import { randomUUID } from "node:crypto";
import { SupportTicketStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { purgeExpiredResolvedSupportTickets, SUPPORT_RESOLVED_RETENTION_MS } from "@/lib/support/service";

describe("support retention", () => {
  const suffix = randomUUID().slice(0, 8);
  let userId = "";

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `support-retention-${suffix}@example.test`, displayName: "Support Retention" } });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  });

  it("keeps recent solved tickets for one day and deletes only expired solved/closed tickets", async () => {
    const now = new Date("2026-10-20T12:00:00.000Z");
    const expiredAt = new Date(now.getTime() - SUPPORT_RESOLVED_RETENTION_MS - 60_000);
    const recentAt = new Date(now.getTime() - SUPPORT_RESOLVED_RETENTION_MS + 60_000);

    const expiredResolved = await prisma.supportTicket.create({ data: { userId, subject: "Expired resolved", category: "Test", status: SupportTicketStatus.RESOLVED } });
    const expiredClosed = await prisma.supportTicket.create({ data: { userId, subject: "Expired closed", category: "Test", status: SupportTicketStatus.CLOSED } });
    const recentResolved = await prisma.supportTicket.create({ data: { userId, subject: "Recent resolved", category: "Test", status: SupportTicketStatus.RESOLVED } });
    const activeOld = await prisma.supportTicket.create({ data: { userId, subject: "Old active", category: "Test", status: SupportTicketStatus.OPEN } });

    await prisma.supportReply.createMany({ data: [
      { ticketId: expiredResolved.id, authorId: userId, message: "resolved reply", isAdminReply: false },
      { ticketId: expiredClosed.id, authorId: userId, message: "closed reply", isAdminReply: false },
    ] });
    await Promise.all([
      prisma.supportTicket.update({ where: { id: expiredResolved.id }, data: { updatedAt: expiredAt } }),
      prisma.supportTicket.update({ where: { id: expiredClosed.id }, data: { updatedAt: expiredAt } }),
      prisma.supportTicket.update({ where: { id: recentResolved.id }, data: { updatedAt: recentAt } }),
      prisma.supportTicket.update({ where: { id: activeOld.id }, data: { updatedAt: expiredAt } }),
    ]);

    expect(await purgeExpiredResolvedSupportTickets(now)).toBe(2);
    expect(await prisma.supportTicket.findUnique({ where: { id: expiredResolved.id } })).toBeNull();
    expect(await prisma.supportTicket.findUnique({ where: { id: expiredClosed.id } })).toBeNull();
    expect(await prisma.supportTicket.findUnique({ where: { id: recentResolved.id } })).not.toBeNull();
    expect(await prisma.supportTicket.findUnique({ where: { id: activeOld.id } })).not.toBeNull();
    expect(await prisma.supportReply.count({ where: { ticketId: { in: [expiredResolved.id, expiredClosed.id] } } })).toBe(0);
  });
});
