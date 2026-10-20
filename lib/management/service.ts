import { LearningMode, Prisma, RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlatformControls, savePlatformControls, type PlatformControls } from "@/lib/platform/settings";

export class ManagementError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "ManagementError";
  }
}

async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, targetType: string, targetId: string, metadata?: Prisma.InputJsonValue) {
  await tx.auditLog.create({ data: { actorId, action, targetType, targetId, ...(metadata ? { metadata } : {}) } });
}

export async function getInstructorOverview(instructorId: string, includeAll = false) {
  const assignments = includeAll
    ? await prisma.user.findMany({
        where: { roles: { some: { role: { key: RoleType.STUDENT } } } },
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true, email: true, suspendedAt: true, progress: { include: { lab: { select: { number: true, title: true } } }, orderBy: { updatedAt: "desc" } }, completions: { select: { id: true } } },
      })
    : (await prisma.instructorAssignment.findMany({
        where: { instructorId },
        orderBy: { student: { displayName: "asc" } },
        include: { student: { select: { id: true, displayName: true, email: true, suspendedAt: true, progress: { include: { lab: { select: { number: true, title: true } } }, orderBy: { updatedAt: "desc" } }, completions: { select: { id: true } } } } },
      })).map((entry) => entry.student);

  const totalLabs = await prisma.lab.count({ where: { enabled: true } });
  return assignments.map((student) => {
    const completed = student.completions.length;
    const inProgress = student.progress.filter((item) => item.status === "IN_PROGRESS").length;
    return {
      id: student.id,
      displayName: student.displayName,
      email: student.email,
      suspended: Boolean(student.suspendedAt),
      completed,
      inProgress,
      completionPct: totalLabs ? Math.round((completed / totalLabs) * 100) : 0,
      recentProgress: student.progress.slice(0, 5).map((item) => ({ labNumber: item.lab.number, labTitle: item.lab.title, status: item.status, completionPct: item.completionPct })),
    };
  });
}

export async function assignStudent(actorId: string, instructorId: string, studentId: string) {
  if (instructorId === studentId) throw new ManagementError("INVALID_ASSIGNMENT", "Instructor and student must be different users.");
  return prisma.$transaction(async (tx) => {
    const [instructor, student] = await Promise.all([
      tx.user.findUnique({ where: { id: instructorId }, include: { roles: { include: { role: true } } } }),
      tx.user.findUnique({ where: { id: studentId }, include: { roles: { include: { role: true } } } }),
    ]);
    if (!instructor?.roles.some((entry) => entry.role.key === RoleType.INSTRUCTOR)) throw new ManagementError("INSTRUCTOR_REQUIRED", "Selected user is not an instructor.", 409);
    if (!student?.roles.some((entry) => entry.role.key === RoleType.STUDENT)) throw new ManagementError("STUDENT_REQUIRED", "Selected user is not a student.", 409);
    const assignment = await tx.instructorAssignment.upsert({ where: { instructorId_studentId: { instructorId, studentId } }, update: {}, create: { instructorId, studentId } });
    await audit(tx, actorId, "management.instructor.assignment.created", "User", studentId, { instructorId });
    return assignment;
  });
}

export async function removeStudentAssignment(actorId: string, instructorId: string, studentId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.instructorAssignment.deleteMany({ where: { instructorId, studentId } });
    await audit(tx, actorId, "management.instructor.assignment.removed", "User", studentId, { instructorId });
  });
}

export async function updateUserAccess(actorId: string, userId: string, input: { roles?: RoleType[]; suspended?: boolean }) {
  if (actorId === userId && input.suspended) throw new ManagementError("SELF_SUSPEND_BLOCKED", "Administrators cannot suspend their own active account.", 409);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!user) throw new ManagementError("USER_NOT_FOUND", "User not found.", 404);

    const currentRoles = user.roles.map((entry) => entry.role.key);
    const currentAdmin = currentRoles.includes(RoleType.ADMIN);
    const requestedRoles = input.roles ? [...new Set(input.roles)] : currentRoles;
    const resultingAdmin = requestedRoles.includes(RoleType.ADMIN);

    if (input.suspended === true && resultingAdmin) {
      throw new ManagementError("ADMIN_SUSPEND_BLOCKED", "Administrator accounts are protected and cannot be suspended.", 409);
    }
    if (resultingAdmin && user.suspendedAt && input.suspended !== false) {
      throw new ManagementError("ADMIN_MUST_BE_ACTIVE", "Restore this account before assigning the Administrator role.", 409);
    }
    if (currentAdmin && !resultingAdmin) {
      const adminRole = await tx.role.findUnique({ where: { key: RoleType.ADMIN } });
      const adminCount = adminRole ? await tx.userRole.count({ where: { roleId: adminRole.id } }) : 0;
      if (adminCount <= 1) throw new ManagementError("LAST_ADMIN_PROTECTED", "The final Administrator account cannot be demoted.", 409);
    }

    if (input.roles) {
      if (!requestedRoles.length) throw new ManagementError("ROLE_REQUIRED", "A user must retain at least one role.");
      const roleRows = await tx.role.findMany({ where: { key: { in: requestedRoles } } });
      if (roleRows.length !== requestedRoles.length) throw new ManagementError("ROLE_UNAVAILABLE", "One or more requested roles are unavailable.", 409);
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({ data: roleRows.map((role) => ({ userId, roleId: role.id })) });
    }

    if (typeof input.suspended === "boolean") {
      await tx.user.update({ where: { id: userId }, data: { suspendedAt: input.suspended ? new Date() : null } });
    }
    await audit(tx, actorId, "management.user.access.updated", "User", userId, { roles: requestedRoles, suspended: input.suspended ?? Boolean(user.suspendedAt) });
    return tx.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  });
}

export async function updatePlatformControls(actorId: string, patch: Partial<{ maintenanceEnabled: boolean; maintenanceMessage: string; maxActiveEnvironmentsPerUser: number; allowedModes: LearningMode[]; showHints: boolean; showSolutions: boolean }>) {
  return prisma.$transaction(async (tx) => {
    const current = await getPlatformControls(tx);
    const next: PlatformControls = {
      maintenance: {
        enabled: patch.maintenanceEnabled ?? current.maintenance.enabled,
        message: patch.maintenanceMessage?.trim().slice(0, 240) || current.maintenance.message,
      },
      quota: {
        maxActiveEnvironmentsPerUser: patch.maxActiveEnvironmentsPerUser === undefined ? current.quota.maxActiveEnvironmentsPerUser : Math.max(1, Math.min(100, Math.floor(patch.maxActiveEnvironmentsPerUser))),
      },
      learning: {
        allowedModes: patch.allowedModes?.length ? [...new Set(patch.allowedModes)] : current.learning.allowedModes,
        showHints: patch.showHints ?? current.learning.showHints,
        showSolutions: patch.showSolutions ?? current.learning.showSolutions,
      },
    };
    await savePlatformControls(tx, next);
    await audit(tx, actorId, "management.platform.controls.updated", "PlatformSetting", "global", next as unknown as Prisma.InputJsonValue);
    return next;
  });
}

export async function updateLabManagement(actorId: string, labId: string, input: {
  enabled?: boolean;
  title?: string;
  objective?: string;
  version?: { id: string; published?: boolean; conceptExplanation?: string; scenario?: string };
  hint?: { id: string; content: string };
  solution?: { id: string; summary?: string; verification?: string; commonMistakes?: string; troubleshooting?: string };
}) {
  return prisma.$transaction(async (tx) => {
    const lab = await tx.lab.findUnique({ where: { id: labId } });
    if (!lab) throw new ManagementError("LAB_NOT_FOUND", "Lab not found.", 404);
    if (input.enabled !== undefined || input.title !== undefined || input.objective !== undefined) {
      await tx.lab.update({ where: { id: labId }, data: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.title !== undefined ? { title: input.title.trim().slice(0, 160) } : {}),
        ...(input.objective !== undefined ? { objective: input.objective.trim().slice(0, 1000) } : {}),
      } });
    }
    if (input.version) {
      const version = await tx.labVersion.findFirst({ where: { id: input.version.id, labId } });
      if (!version) throw new ManagementError("VERSION_NOT_FOUND", "Lab version not found.", 404);
      await tx.labVersion.update({ where: { id: version.id }, data: {
        ...(input.version.published !== undefined ? { published: input.version.published } : {}),
        ...(input.version.conceptExplanation !== undefined ? { conceptExplanation: input.version.conceptExplanation.trim().slice(0, 12000) } : {}),
        ...(input.version.scenario !== undefined ? { scenario: input.version.scenario.trim().slice(0, 12000) } : {}),
      } });
    }
    if (input.hint) {
      const hint = await tx.labHint.findFirst({ where: { id: input.hint.id, labVersion: { labId } } });
      if (!hint) throw new ManagementError("HINT_NOT_FOUND", "Lab hint not found.", 404);
      await tx.labHint.update({ where: { id: hint.id }, data: { content: input.hint.content.trim().slice(0, 8000) } });
    }
    if (input.solution) {
      const solution = await tx.labSolution.findFirst({ where: { id: input.solution.id, labVersion: { labId } } });
      if (!solution) throw new ManagementError("SOLUTION_NOT_FOUND", "Lab solution not found.", 404);
      await tx.labSolution.update({ where: { id: solution.id }, data: {
        ...(input.solution.summary !== undefined ? { summary: input.solution.summary.trim().slice(0, 12000) } : {}),
        ...(input.solution.verification !== undefined ? { verification: input.solution.verification.trim().slice(0, 12000) } : {}),
        ...(input.solution.commonMistakes !== undefined ? { commonMistakes: input.solution.commonMistakes.trim().slice(0, 12000) } : {}),
        ...(input.solution.troubleshooting !== undefined ? { troubleshooting: input.solution.troubleshooting.trim().slice(0, 12000) } : {}),
      } });
    }
    await audit(tx, actorId, "management.lab.updated", "Lab", labId, { fields: Object.keys(input) });
    return tx.lab.findUniqueOrThrow({ where: { id: labId }, include: { versions: { orderBy: { version: "desc" }, take: 1, include: { hints: { orderBy: { level: "asc" } }, solution: true } } } });
  });
}

export async function getAdminOverview() {
  const [controls, users, labs, auditLogs, counts, databaseVersion] = await Promise.all([
    getPlatformControls(),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { roles: { include: { role: true } } } }),
    prisma.lab.findMany({ orderBy: { number: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 1, include: { hints: { orderBy: { level: "asc" } }, solution: true } } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { displayName: true, email: true } } } }),
    Promise.all([prisma.user.count(), prisma.labEnvironment.count({ where: { completedAt: null } }), prisma.validationResult.count({ where: { passed: false } }), prisma.completionRecord.count()]),
    prisma.$queryRaw<Array<{ version: string }>>`SELECT sqlite_version() AS version`,
  ]);
  return {
    controls,
    users: users.map((user) => ({ id: user.id, displayName: user.displayName, email: user.email, suspended: Boolean(user.suspendedAt), roles: user.roles.map((entry) => entry.role.key), createdAt: user.createdAt })),
    labs,
    auditLogs,
    health: { users: counts[0], activeEnvironments: counts[1], failedValidations: counts[2], completions: counts[3], database: "Operational", sqliteVersion: databaseVersion[0]?.version ?? "unknown" },
  };
}
