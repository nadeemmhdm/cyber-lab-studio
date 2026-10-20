import { randomUUID } from "node:crypto";
import { RoleType, SupportTicketStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { AdminBootstrapError, claimInitialAdmin, getInitialAdminState } from "@/lib/setup/admin-bootstrap";
import { addAdminSupportReply, addUserSupportReply, createSupportTicket, listAdminSupportTickets, listUserTickets, updateSupportTicketStatus } from "@/lib/support/service";

const suffix = randomUUID().slice(0, 8);
const previousInitialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
let adminId = "";
let userId = "";

beforeAll(async () => {
  const adminEmail = `release-admin-${suffix}@example.test`;
  process.env.INITIAL_ADMIN_EMAIL = adminEmail;
  const [admin, user] = await Promise.all([
    prisma.user.create({ data: { email: adminEmail, displayName: "Release Admin", emailVerifiedAt: new Date() } }),
    prisma.user.create({ data: { email: `release-user-${suffix}@example.test`, displayName: "Release User", emailVerifiedAt: new Date() } }),
  ]);
  adminId = admin.id;
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [adminId, userId].filter(Boolean) } } });
  if (previousInitialAdminEmail === undefined) delete process.env.INITIAL_ADMIN_EMAIL;
  else process.env.INITIAL_ADMIN_EMAIL = previousInitialAdminEmail;
  await prisma.$disconnect();
});

describe("release admin bootstrap and support workflow", () => {
  it("allows only the configured verified account to claim the first administrator role", async () => {
    const before = await getInitialAdminState(adminId);
    expect(before.configured).toBe(true);
    expect(before.adminExists).toBe(false);
    expect(before.eligible).toBe(true);

    await claimInitialAdmin(adminId);
    const role = await prisma.userRole.findFirst({ where: { userId: adminId, role: { key: RoleType.ADMIN } } });
    expect(role).not.toBeNull();

    const after = await getInitialAdminState(userId);
    expect(after.adminExists).toBe(true);
    expect(after.eligible).toBe(false);
    await expect(claimInitialAdmin(userId)).rejects.toMatchObject({ code: "ALREADY_CONFIGURED" } satisfies Partial<AdminBootstrapError>);
  });

  it("keeps support tickets private to the reporter while administrators can reply", async () => {
    const ticket = await createSupportTicket(userId, {
      subject: "Lab validation issue",
      category: "Lab issue",
      message: "The release test user is reporting a reproducible validation issue.",
    });

    const own = await listUserTickets(userId);
    expect(own.some((entry) => entry.id === ticket.id)).toBe(true);
    const adminDesk = await listAdminSupportTickets();
    const visible = adminDesk.find((entry) => entry.id === ticket.id);
    expect(visible?.user.id).toBe(userId);
    expect(visible?.replies[0]?.isAdminReply).toBe(false);

    await addAdminSupportReply(adminId, ticket.id, "Thanks. We reproduced the issue and are reviewing the lab state.");
    const afterReply = await listUserTickets(userId);
    expect(afterReply.find((entry) => entry.id === ticket.id)?.replies.some((reply) => reply.isAdminReply)).toBe(true);
  });

  it("supports resolve, reopen-on-user-reply, and close lifecycle", async () => {
    const ticket = (await listUserTickets(userId))[0];
    expect(ticket).toBeDefined();
    await updateSupportTicketStatus(adminId, ticket.id, SupportTicketStatus.RESOLVED);
    await addUserSupportReply(userId, ticket.id, "I retried the workflow and still need help with the same report.");
    const reopened = await prisma.supportTicket.findUnique({ where: { id: ticket.id } });
    expect(reopened?.status).toBe(SupportTicketStatus.OPEN);

    await updateSupportTicketStatus(adminId, ticket.id, SupportTicketStatus.CLOSED);
    await expect(addUserSupportReply(userId, ticket.id, "This should not be accepted after closure.")).rejects.toMatchObject({ code: "TICKET_CLOSED" });
  });
});
