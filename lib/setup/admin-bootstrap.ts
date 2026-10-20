import { RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AdminBootstrapError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "AdminBootstrapError";
  }
}

function configuredEmail() {
  return process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export async function getInitialAdminState(userId?: string) {
  const adminRole = await prisma.role.findUnique({ where: { key: RoleType.ADMIN } });
  const adminCount = adminRole ? await prisma.userRole.count({ where: { roleId: adminRole.id } }) : 0;
  if (!userId) return { configured: Boolean(configuredEmail()), adminExists: adminCount > 0, eligible: false };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } });
  const expected = configuredEmail();
  return {
    configured: Boolean(expected),
    adminExists: adminCount > 0,
    eligible: Boolean(expected && adminCount === 0 && user?.emailVerifiedAt && user.email.toLowerCase() === expected),
  };
}

export async function claimInitialAdmin(userId: string) {
  const expected = configuredEmail();
  if (!expected) throw new AdminBootstrapError("SETUP_NOT_CONFIGURED", "Initial administrator setup is not configured.", 503);

  return prisma.$transaction(async (tx) => {
    const adminRole = await tx.role.upsert({ where: { key: RoleType.ADMIN }, update: {}, create: { key: RoleType.ADMIN, name: "Admin", description: "Administers the CyberLab platform." } });
    const existingAdmins = await tx.userRole.count({ where: { roleId: adminRole.id } });
    if (existingAdmins > 0) throw new AdminBootstrapError("ALREADY_CONFIGURED", "An administrator already exists. Initial setup is disabled.", 409);

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || !user.emailVerifiedAt || user.email.toLowerCase() !== expected) throw new AdminBootstrapError("NOT_ELIGIBLE", "This verified account is not eligible to claim the initial administrator role.", 403);

    await tx.userRole.upsert({ where: { userId_roleId: { userId, roleId: adminRole.id } }, update: {}, create: { userId, roleId: adminRole.id } });
    await tx.auditLog.create({ data: { actorId: userId, action: "setup.initial_admin.claimed", targetType: "User", targetId: userId } });
    return { userId, role: RoleType.ADMIN };
  });
}
