import { RoleType } from "@prisma/client";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export class AccountProvisionError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "AccountProvisionError";
  }
}

export async function provisionInstructor(actorId: string, input: { email: string; displayName: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim().slice(0, 120);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AccountProvisionError("EMAIL_INVALID", "Enter a valid instructor email address.");
  if (displayName.length < 2) throw new AccountProvisionError("NAME_INVALID", "Instructor name is required.");
  if (input.password.length < 10 || input.password.length > 128) throw new AccountProvisionError("PASSWORD_INVALID", "Temporary password must contain 10-128 characters.");
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new AccountProvisionError("ACCOUNT_EXISTS", "An account already exists for this email.", 409);

  let firebaseUid = "";
  try {
    const firebaseUser = await getFirebaseAdminAuth().createUser({ email, password: input.password, emailVerified: true, displayName, disabled: false });
    firebaseUid = firebaseUser.uid;
    return await prisma.$transaction(async (tx) => {
      const role = await tx.role.upsert({ where: { key: RoleType.INSTRUCTOR }, update: {}, create: { key: RoleType.INSTRUCTOR, name: "Instructor", description: "Assigns learners and reviews lab progress." } });
      const user = await tx.user.create({ data: { firebaseUid, email, displayName, emailVerifiedAt: new Date(), roles: { create: { roleId: role.id } } } });
      await tx.auditLog.create({ data: { actorId, action: "management.instructor.provisioned", targetType: "User", targetId: user.id, metadata: { email } } });
      return user;
    });
  } catch (error) {
    if (firebaseUid) await getFirebaseAdminAuth().deleteUser(firebaseUid).catch(() => undefined);
    if (error instanceof AccountProvisionError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code.includes("email-already-exists")) throw new AccountProvisionError("ACCOUNT_EXISTS", "An authentication account already exists for this email.", 409);
    throw error;
  }
}
