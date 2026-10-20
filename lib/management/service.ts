import { LearningMode, Prisma, ProgressStatus, RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class ManagementError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "ManagementError";
  }
}

export async function assignInstructor(actorId: string, instructorId: string, studentId: string) {
  if (instructorId === studentId) throw new ManagementError("INVALID_ASSIGNMENT", "Instructor and student must be different users.");
  return prisma.$transaction(async (tx) => {
    const [instructorRole, studentRole] = await Promise.all([
      tx.userRole.findFirst({ where: { userId: instructorId, role: { key: RoleType.INSTRUCTOR } } }),
      tx.userRole.findFirst({ where: { userId: studentId, role: { key: RoleType.STUDENT } } }),
    ]);
    if (!instructorRole || !studentRole) throw new ManagementError("ROLE_MISMATCH", "Assignment requires an instructor and a student.", 409);
    const assignment = await tx.instructorAssignment.upsert({ where: { instructorId_studentId: { instructorId, studentId } }, update: {}, create: { instructorId, studentId } });
    await tx.auditLog.create({ data: { actorId, action: "ADMIN_INSTRUCTOR_ASSIGNED", targetType: "User", targetId: studentId, metadata: { instructorId } } });
    return assignment;
  });
}

export async function removeInstructorAssignment(actorId: string, instructorId: string, studentId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.instructorAssignment.deleteMany({ where: { instructorId, studentId } });
    await tx.auditLog.create({ data: { actorId, action: "ADMIN_INSTRUCTOR_UNASSIGNED", targetType: "User", targetId: studentId, metadata: { instructorId } } });
  });
}

export async function setUserRoles(actorId: string, targetUserId: string, roles: RoleType[]) {
  const unique = Array.from(new Set(roles));
  if (!unique.length) throw new ManagementError("ROLE_REQUIRED", "A user must retain at least one role.");
  if (actorId === targetUserId && !unique.includes(RoleType.ADMIN)) throw new ManagementError("SELF_ADMIN_REMOVAL", "You cannot remove your own admin role.", 409);
  return prisma.$transaction(async (tx) => {
    const roleRows = await tx.role.findMany({ where: { key: { in: unique } } });
    if (roleRows.length !== unique.length) throw new ManagementError("ROLE_UNAVAILABLE", "One or more requested roles are unavailable.", 409);
    await tx.userRole.deleteMany({ where: { userId: targetUserId } });
    await tx.userRole.createMany({ data: roleRows.map((role) => ({ userId: targetUserId, roleId: role.id })) });
    await tx.auditLog.create({ data: { actorId, action: "ADMIN_USER_ROLES_UPDATED", targetType: "User", targetId: targetUserId, metadata: { roles: unique } } });
    return unique;
  });
}

export async function setUserSuspended(actorId: string, targetUserId: string, suspended: boolean) {
  if (actorId === targetUserId && suspended) throw new ManagementError("SELF_SUSPEND", "You cannot suspend your own account.", 409);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: targetUserId }, data: { suspendedAt: suspended ? new Date() : null } });
    await tx.auditLog.create({ data: { actorId, action: suspended ? "ADMIN_USER_SUSPENDED" : "ADMIN_USER_RESTORED", targetType: "User", targetId: targetUserId } });
    return user;
  });
}

export async function listInstructorStudents(instructorId: string) {
  const assignments = await prisma.instructorAssignment.findMany({
    where: { instructorId },
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: {
          id: true, email: true, displayName: true, suspendedAt: true,
          progress: { include: { lab: { select: { number: true, title: true, slug: true } } }, orderBy: { updatedAt: "desc" } },
          completions: { select: { id: true } },
        },
      },
    },
  });
  return assignments.map(({ student, createdAt }) => ({
    ...student,
    assignedAt: createdAt,
    completedLabs: student.completions.length,
    inProgressLabs: student.progress.filter((entry) => entry.status === ProgressStatus.IN_PROGRESS).length,
  }));
}

export async function updateLabMetadata(actorId: string, slug: string, input: { enabled?: boolean; title?: string; objective?: string; estimatedMinutes?: number }) {
  const data: Prisma.LabUpdateInput = {};
  if (typeof input.enabled === "boolean") data.enabled = input.enabled;
  if (typeof input.title === "string" && input.title.trim()) data.title = input.title.trim().slice(0, 160);
  if (typeof input.objective === "string" && input.objective.trim()) data.objective = input.objective.trim().slice(0, 500);
  if (typeof input.estimatedMinutes === "number") data.estimatedMinutes = Math.max(5, Math.min(480, Math.trunc(input.estimatedMinutes)));
  return prisma.$transaction(async (tx) => {
    const lab = await tx.lab.update({ where: { slug }, data });
    await tx.auditLog.create({ data: { actorId, action: "ADMIN_LAB_UPDATED", targetType: "Lab", targetId: lab.id, metadata: { slug, ...input } } });
    return lab;
  });
}

export async function updatePublishedCurriculum(actorId: string, slug: string, input: { conceptExplanation?: string; scenario?: string; hints?: string[]; solutionSummary?: string }) {
  return prisma.$transaction(async (tx) => {
    const lab = await tx.lab.findUnique({ where: { slug }, include: { versions: { where: { published: true }, orderBy: { version: "desc" }, take: 1, include: { hints: true, solution: true } } } });
    const version = lab?.versions[0];
    if (!lab || !version) throw new ManagementError("LAB_VERSION_UNAVAILABLE", "Published lab version not found.", 404);
    await tx.labVersion.update({ where: { id: version.id }, data: {
      ...(input.conceptExplanation !== undefined ? { conceptExplanation: input.conceptExplanation.trim().slice(0, 12000) } : {}),
      ...(input.scenario !== undefined ? { scenario: input.scenario.trim().slice(0, 8000) } : {}),
    } });
    if (input.hints) {
      if (input.hints.length !== 3 || input.hints.some((hint) => !hint.trim())) throw new ManagementError("INVALID_HINTS", "Exactly three non-empty hints are required.");
      for (let index = 0; index < 3; index += 1) {
        await tx.labHint.upsert({ where: { labVersionId_level: { labVersionId: version.id, level: index + 1 } }, update: { content: input.hints[index].trim().slice(0, 4000) }, create: { labVersionId: version.id, level: index + 1, content: input.hints[index].trim().slice(0, 4000) } });
      }
    }
    if (input.solutionSummary !== undefined && version.solution) {
      await tx.labSolution.update({ where: { labVersionId: version.id }, data: { summary: input.solutionSummary.trim().slice(0, 8000) } });
    }
    await tx.auditLog.create({ data: { actorId, action: "ADMIN_CURRICULUM_UPDATED", targetType: "LabVersion", targetId: version.id, metadata: { slug, fields: Object.keys(input) } } });
    return version.id;
  });
}

export async function createLabVersion(actorId: string, slug: string) {
  return prisma.$transaction(async (tx) => {
    const lab = await tx.lab.findUnique({ where: { slug }, include: { versions: { orderBy: { version: "desc" }, take: 1, include: { tasks: true, hints: true, solution: true } } } });
    const source = lab?.versions[0];
    if (!lab || !source) throw new ManagementError("LAB_VERSION_UNAVAILABLE", "Source lab version not found.", 404);
    const nextVersion = source.version + 1;
    const version = await tx.labVersion.create({ data: {
      labId: lab.id, version: nextVersion, published: false, conceptExplanation: source.conceptExplanation, scenario: source.scenario,
      prerequisites: source.prerequisites, supportedCommands: source.supportedCommands, supportedUi: source.supportedUi, initialState: source.initialState, validationConfig: source.validationConfig,
    } });
    if (source.tasks.length) await tx.labTask.createMany({ data: source.tasks.map((task) => ({ labVersionId: version.id, position: task.position, title: task.title, instruction: task.instruction, validatorKey: task.validatorKey })) });
    if (source.hints.length) await tx.labHint.createMany({ data: source.hints.map((hint) => ({ labVersionId: version.id, level: hint.level, content: hint.content })) });
    if (source.solution) await tx.labSolution.create({ data: { labVersionId: version.id, problem: source.solution.problem, concept: source.solution.concept, uiNavigation: source.solution.uiNavigation, commands: source.solution.commands, expectedOutput: source.solution.expectedOutput, whyItWorks: source.solution.whyItWorks, securityConsequence: source.solution.securityConsequence, verification: source.solution.verification, commonMistakes: source.solution.commonMistakes, troubleshooting: source.solution.troubleshooting, summary: source.solution.summary } });
    await tx.auditLog.create({ data: { actorId, action: "ADMIN_LAB_VERSION_CREATED", targetType: "LabVersion", targetId: version.id, metadata: { slug, version: nextVersion } } });
    return version;
  });
}

export async function publishLabVersion(actorId: string, slug: string, versionNumber: number) {
  return prisma.$transaction(async (tx) => {
    const lab = await tx.lab.findUnique({ where: { slug } });
    if (!lab) throw new ManagementError("LAB_NOT_FOUND", "Lab not found.", 404);
    const target = await tx.labVersion.findUnique({ where: { labId_version: { labId: lab.id, version: versionNumber } } });
    if (!target) throw new ManagementError("LAB_VERSION_UNAVAILABLE", "Lab version not found.", 404);
    await tx.labVersion.updateMany({ where: { labId: lab.id }, data: { published: false } });
    await tx.labVersion.update({ where: { id: target.id }, data: { published: true } });
    await tx.auditLog.create({ data: { actorId, action: "ADMIN_LAB_VERSION_PUBLISHED", targetType: "LabVersion", targetId: target.id, metadata: { slug, version: versionNumber } } });
    return target;
  });
}

export async function getAdminOverview() {
  const [users, labs, audits, settings] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { roles: { include: { role: true } } } }),
    prisma.lab.findMany({ orderBy: { number: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 3 } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { displayName: true, email: true } } } }),
    prisma.platformSetting.findMany(),
  ]);
  return { users, labs, audits, settings };
}

export function normalizeLearningModes(value: unknown): LearningMode[] {
  if (!Array.isArray(value)) return [];
  return value.filter((mode): mode is LearningMode => typeof mode === "string" && Object.values(LearningMode).includes(mode as LearningMode));
}
