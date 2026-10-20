import { timingSafeEqual } from "node:crypto";
import { RoleType } from "@prisma/client";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
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

function configuredToken() {
  return process.env.INITIAL_ADMIN_SETUP_TOKEN ?? "";
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getInitialAdminState() {
  const adminRole = await prisma.role.findUnique({ where: { key: RoleType.ADMIN } });
  const adminCount = adminRole ? await prisma.userRole.count({ where: { roleId: adminRole.id } }) : 0;
  return {
    configured: Boolean(configuredToken() && configuredToken().length >= 32),
    adminExists: adminCount > 0,
    emailRestricted: Boolean(configuredEmail()),
  };
}

export async function provisionInitialAdmin(input: { setupToken: string; email: string; displayName: string; password: string }) {
  const expectedToken = configuredToken();
  if (!expectedToken || expectedToken.length < 32) throw new AdminBootstrapError("SETUP_NOT_CONFIGURED", "Set INITIAL_ADMIN_SETUP_TOKEN to a random value of at least 32 characters and restart the server.", 503);
  if (!safeEqual(input.setupToken, expectedToken)) throw new AdminBootstrapError("SETUP_TOKEN_INVALID", "The first-run setup token is invalid.", 403);

  const email = input.email.trim().toLowerCase();
  const restrictedEmail = configuredEmail();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AdminBootstrapError("EMAIL_INVALID", "Enter a valid administrator email address.");
  if (restrictedEmail && email !== restrictedEmail) throw new AdminBootstrapError("EMAIL_NOT_ALLOWED", "This email does not match INITIAL_ADMIN_EMAIL.", 403);
  const displayName = input.displayName.trim().slice(0, 120);
  if (displayName.length < 2) throw new AdminBootstrapError("NAME_INVALID", "Administrator display name is required.");
  if (input.password.length < 12 || input.password.length > 128) throw new AdminBootstrapError("PASSWORD_INVALID", "Administrator password must contain 12-128 characters.");

  const existingState = await getInitialAdminState();
  if (existingState.adminExists) throw new AdminBootstrapError("ALREADY_CONFIGURED", "An administrator already exists. Initial setup is permanently disabled.", 409);
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new AdminBootstrapError("ACCOUNT_EXISTS", "An account already exists for this email. Use the existing administrator recovery process instead.", 409);

  let firebaseUid = "";
  try {
    const firebaseUser = await getFirebaseAdminAuth().createUser({ email, password: input.password, emailVerified: true, displayName, disabled: false });
    firebaseUid = firebaseUser.uid;
    return await prisma.$transaction(async (tx) => {
      const adminRole = await tx.role.upsert({ where: { key: RoleType.ADMIN }, update: {}, create: { key: RoleType.ADMIN, name: "Admin", description: "Administers the CyberLab platform." } });
      const existingAdmins = await tx.userRole.count({ where: { roleId: adminRole.id } });
      if (existingAdmins > 0) throw new AdminBootstrapError("ALREADY_CONFIGURED", "An administrator already exists. Initial setup is permanently disabled.", 409);
      const user = await tx.user.create({ data: { firebaseUid, email, displayName, emailVerifiedAt: new Date(), roles: { create: { roleId: adminRole.id } } } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "setup.initial_admin.provisioned", targetType: "User", targetId: user.id } });
      return { userId: user.id, email: user.email, role: RoleType.ADMIN };
    });
  } catch (error) {
    if (firebaseUid) await getFirebaseAdminAuth().deleteUser(firebaseUid).catch(() => undefined);
    if (error instanceof AdminBootstrapError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code.includes("email-already-exists")) throw new AdminBootstrapError("ACCOUNT_EXISTS", "A Firebase Authentication account already exists for this email.", 409);
    throw error;
  }
}
