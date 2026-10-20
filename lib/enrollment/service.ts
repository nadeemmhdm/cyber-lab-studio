import { createHash, randomBytes } from "node:crypto";
import { RoleType } from "@prisma/client";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { studentLoginEmail } from "@/lib/auth/login-throttle";
import { appUrl } from "@/lib/auth/security";
import { prisma } from "@/lib/prisma";

export class EnrollmentError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "EnrollmentError";
  }
}

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validUsername(value: string) {
  return /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/.test(value);
}

export async function createEnrollmentInvite(instructorId: string, input: { maxUses: number; expiresHours?: number; label?: string }) {
  const maxUses = Math.max(1, Math.min(500, Math.floor(input.maxUses)));
  const expiresHours = Math.max(1, Math.min(24 * 30, Math.floor(input.expiresHours ?? 72)));
  const instructor = await prisma.user.findFirst({ where: { id: instructorId, roles: { some: { role: { key: RoleType.INSTRUCTOR } } }, suspendedAt: null }, select: { id: true } });
  if (!instructor) throw new EnrollmentError("INSTRUCTOR_REQUIRED", "Only an active instructor can create student enrollment links.", 403);
  const token = randomBytes(32).toString("base64url");
  const invite = await prisma.enrollmentInvite.create({
    data: {
      instructorId,
      tokenHash: digest(token),
      maxUses,
      expiresAt: new Date(Date.now() + expiresHours * 60 * 60_000),
      label: input.label?.trim().slice(0, 120) || null,
    },
  });
  await prisma.auditLog.create({ data: { actorId: instructorId, action: "enrollment.invite.created", targetType: "EnrollmentInvite", targetId: invite.id, metadata: { maxUses, expiresHours } } });
  return { ...invite, url: appUrl(`/join/${token}`) };
}

export async function listEnrollmentInvites(instructorId: string) {
  return prisma.enrollmentInvite.findMany({ where: { instructorId }, orderBy: { createdAt: "desc" }, take: 50, include: { registrations: { select: { student: { select: { id: true, username: true, displayName: true } }, createdAt: true } } } });
}

export async function revokeEnrollmentInvite(instructorId: string, inviteId: string) {
  const invite = await prisma.enrollmentInvite.findFirst({ where: { id: inviteId, instructorId } });
  if (!invite) throw new EnrollmentError("INVITE_NOT_FOUND", "Enrollment link not found.", 404);
  await prisma.enrollmentInvite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });
  await prisma.auditLog.create({ data: { actorId: instructorId, action: "enrollment.invite.revoked", targetType: "EnrollmentInvite", targetId: inviteId } });
}

export async function inspectEnrollmentToken(token: string) {
  const invite = await prisma.enrollmentInvite.findUnique({ where: { tokenHash: digest(token) }, include: { instructor: { select: { displayName: true } } } });
  if (!invite) throw new EnrollmentError("INVITE_INVALID", "This enrollment link is invalid.", 404);
  const now = new Date();
  const active = !invite.revokedAt && invite.expiresAt > now && invite.usedCount < invite.maxUses;
  return { id: invite.id, label: invite.label, instructorName: invite.instructor.displayName, maxUses: invite.maxUses, usedCount: invite.usedCount, remaining: Math.max(0, invite.maxUses - invite.usedCount), expiresAt: invite.expiresAt, active };
}

export async function registerStudentWithInvite(token: string, input: { username: string; password: string }) {
  const username = normalizeUsername(input.username);
  if (!validUsername(username)) throw new EnrollmentError("USERNAME_INVALID", "Username must be 3-32 characters using letters, numbers, dot, underscore, or hyphen.");
  if (input.password.length < 10 || input.password.length > 128) throw new EnrollmentError("PASSWORD_INVALID", "Password must contain 10-128 characters.");
  const tokenHash = digest(token);
  const invite = await prisma.enrollmentInvite.findUnique({ where: { tokenHash }, include: { instructor: { select: { id: true, suspendedAt: true } } } });
  if (!invite || invite.instructor.suspendedAt) throw new EnrollmentError("INVITE_INVALID", "This enrollment link is unavailable.", 404);
  const now = new Date();
  if (invite.revokedAt || invite.expiresAt <= now) throw new EnrollmentError("INVITE_EXPIRED", "This enrollment link has expired or was revoked.", 410);
  if (await prisma.user.findFirst({ where: { OR: [{ username }, { email: studentLoginEmail(username) }] }, select: { id: true } })) throw new EnrollmentError("USERNAME_TAKEN", "That username is already in use.", 409);

  const reserved = await prisma.enrollmentInvite.updateMany({
    where: { id: invite.id, revokedAt: null, expiresAt: { gt: now }, usedCount: { lt: invite.maxUses } },
    data: { usedCount: { increment: 1 } },
  });
  if (reserved.count !== 1) throw new EnrollmentError("INVITE_FULL", "This enrollment link has no remaining seats.", 409);

  const email = studentLoginEmail(username);
  let firebaseUid = "";
  try {
    const firebaseUser = await getFirebaseAdminAuth().createUser({ email, password: input.password, emailVerified: true, displayName: username, disabled: false });
    firebaseUid = firebaseUser.uid;
    const user = await prisma.$transaction(async (tx) => {
      const studentRole = await tx.role.upsert({ where: { key: RoleType.STUDENT }, update: {}, create: { key: RoleType.STUDENT, name: "Student", description: "Learns and completes labs." } });
      const created = await tx.user.create({ data: { firebaseUid, username, email, displayName: username, emailVerifiedAt: new Date(), roles: { create: { roleId: studentRole.id } } } });
      await tx.instructorAssignment.create({ data: { instructorId: invite.instructorId, studentId: created.id } });
      await tx.enrollmentRegistration.create({ data: { inviteId: invite.id, studentId: created.id } });
      await tx.auditLog.create({ data: { actorId: created.id, action: "enrollment.student.joined", targetType: "EnrollmentInvite", targetId: invite.id, metadata: { instructorId: invite.instructorId } } });
      return created;
    });
    return { id: user.id, username: user.username, displayName: user.displayName };
  } catch (error) {
    if (firebaseUid) await getFirebaseAdminAuth().deleteUser(firebaseUid).catch(() => undefined);
    await prisma.enrollmentInvite.update({ where: { id: invite.id }, data: { usedCount: { decrement: 1 } } }).catch(() => undefined);
    if (error instanceof EnrollmentError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code.includes("email-already-exists") || code.includes("uid-already-exists")) throw new EnrollmentError("USERNAME_TAKEN", "That username is already in use.", 409);
    throw error;
  }
}
