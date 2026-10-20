import { LearningMode, Prisma, ProgressStatus } from "@prisma/client";
import { getPlatformControls, userHasPrivilegedRole } from "@/lib/management/settings";
import { prisma } from "@/lib/prisma";

export class LabEngineError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "LabEngineError";
  }
}

export type ModePolicy = { showConcepts: boolean; showHints: boolean; showSolution: boolean };

export function getModePolicy(mode: LearningMode): ModePolicy {
  if (mode === LearningMode.CHALLENGE) return { showConcepts: false, showHints: false, showSolution: false };
  return { showConcepts: true, showHints: true, showSolution: true };
}

function jsonArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
function cloneJson(value: Prisma.JsonValue): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
function initialInventory(initialState: Prisma.JsonValue): Prisma.InputJsonValue {
  if (initialState && typeof initialState === "object" && !Array.isArray(initialState)) {
    const candidate = (initialState as Record<string, Prisma.JsonValue>).resourceInventory;
    if (Array.isArray(candidate)) return cloneJson(candidate);
  }
  return [];
}
async function ensureNotCompleted(tx: Prisma.TransactionClient, userId: string, labId: string) {
  const completion = await tx.completionRecord.findUnique({ where: { userId_labId: { userId, labId } }, select: { id: true } });
  if (completion) throw new LabEngineError("LAB_ALREADY_COMPLETED", "This lab has already been verified and its certified environment is locked.", 409);
}
async function ensureOperational(tx: Prisma.TransactionClient, userId: string) {
  const controls = await getPlatformControls(tx);
  if (controls.maintenanceMode && !(await userHasPrivilegedRole(tx, userId))) throw new LabEngineError("PLATFORM_MAINTENANCE", "Labs are temporarily unavailable while platform maintenance is active.", 503);
  return controls;
}
async function ensureStartAllowed(tx: Prisma.TransactionClient, userId: string, mode: LearningMode) {
  const controls = await ensureOperational(tx, userId);
  const privileged = await userHasPrivilegedRole(tx, userId);
  if (!privileged && !controls.allowedLearningModes.includes(mode)) throw new LabEngineError("MODE_DISABLED", "This learning mode is currently disabled.", 403);
  if (!privileged) {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startsToday = await tx.labAttempt.count({ where: { userId, startedAt: { gte: dayStart } } });
    if (startsToday >= controls.maxLabStartsPerDay) throw new LabEngineError("DAILY_LAB_QUOTA", "Your daily lab-start quota has been reached.", 429);
  }
  return controls;
}
function applyVisibility(mode: LearningMode, showHints: boolean, showSolutions: boolean): ModePolicy {
  const base = getModePolicy(mode);
  return { ...base, showHints: base.showHints && showHints, showSolution: base.showSolution && showSolutions };
}

export async function resolvePublishedLab(slug: string, tx: Prisma.TransactionClient = prisma) {
  const lab = await tx.lab.findFirst({ where: { slug, enabled: true }, include: { versions: { where: { published: true }, orderBy: { version: "desc" }, take: 1, include: { tasks: { orderBy: { position: "asc" } }, hints: { orderBy: { level: "asc" } }, solution: true } } } });
  if (!lab) throw new LabEngineError("LAB_NOT_FOUND", "Lab not found or disabled.", 404);
  const version = lab.versions[0];
  if (!version) throw new LabEngineError("LAB_VERSION_UNAVAILABLE", "This lab has no published runtime version.", 409);
  return { lab, version };
}
async function ensurePrerequisites(tx: Prisma.TransactionClient, userId: string, prerequisiteIds: Prisma.JsonValue) {
  const required = jsonArray(prerequisiteIds);
  if (!required.length) return;
  const completed = await tx.completionRecord.count({ where: { userId, labId: { in: required } } });
  if (completed !== required.length) throw new LabEngineError("PREREQUISITES_INCOMPLETE", "Complete the prerequisite labs first.", 409);
}

export async function startLab(userId: string, slug: string, mode: LearningMode) {
  return prisma.$transaction(async (tx) => {
    const { lab, version } = await resolvePublishedLab(slug, tx);
    const controls = await ensureStartAllowed(tx, userId, mode);
    await ensureNotCompleted(tx, userId, lab.id);
    await ensurePrerequisites(tx, userId, lab.prerequisiteIds);
    const environment = await tx.labEnvironment.upsert({ where: { userId_labId_labVersionId: { userId, labId: lab.id, labVersionId: version.id } }, update: {}, create: { userId, labId: lab.id, labVersionId: version.id, environmentState: cloneJson(version.initialState), resourceInventory: initialInventory(version.initialState) } });
    const existingProgress = await tx.labProgress.findUnique({ where: { userId_labId: { userId, labId: lab.id } } });
    const progress = await tx.labProgress.upsert({ where: { userId_labId: { userId, labId: lab.id } }, create: { userId, labId: lab.id, status: ProgressStatus.IN_PROGRESS, completionPct: 0, startedAt: new Date() }, update: existingProgress?.status === ProgressStatus.COMPLETED ? {} : { status: ProgressStatus.IN_PROGRESS, startedAt: existingProgress?.startedAt ?? new Date() } });
    const attempt = await tx.labAttempt.create({ data: { userId, labId: lab.id, labVersionId: version.id, mode } });
    return { lab, version, environment, progress, attempt, policy: applyVisibility(mode, controls.showHints, controls.showSolutions) };
  });
}

export async function getWorkspace(userId: string, slug: string) {
  const { lab, version } = await resolvePublishedLab(slug);
  const [environment, progress, attempt, controls] = await Promise.all([
    prisma.labEnvironment.findUnique({ where: { userId_labId_labVersionId: { userId, labId: lab.id, labVersionId: version.id } }, include: { resources: { orderBy: { resourceKey: "asc" } } } }),
    prisma.labProgress.findUnique({ where: { userId_labId: { userId, labId: lab.id } } }),
    prisma.labAttempt.findFirst({ where: { userId, labId: lab.id, labVersionId: version.id }, orderBy: { startedAt: "desc" } }),
    getPlatformControls(),
  ]);
  if (!environment) return null;
  const mode = attempt?.mode ?? LearningMode.GUIDED;
  return { lab, version, environment, progress, attempt, policy: applyVisibility(mode, controls.showHints, controls.showSolutions) };
}

export async function resetLab(userId: string, slug: string) {
  return prisma.$transaction(async (tx) => {
    const { lab, version } = await resolvePublishedLab(slug, tx);
    await ensureOperational(tx, userId);
    await ensureNotCompleted(tx, userId, lab.id);
    const environment = await tx.labEnvironment.findUnique({ where: { userId_labId_labVersionId: { userId, labId: lab.id, labVersionId: version.id } } });
    if (!environment) throw new LabEngineError("ENVIRONMENT_NOT_STARTED", "Start the lab before resetting it.", 409);
    await tx.simulatedResource.deleteMany({ where: { environmentId: environment.id } });
    const reset = await tx.labEnvironment.update({ where: { id: environment.id }, data: { environmentState: cloneJson(version.initialState), resourceInventory: initialInventory(version.initialState), resetCount: { increment: 1 }, completedAt: null } });
    await tx.labProgress.upsert({ where: { userId_labId: { userId, labId: lab.id } }, create: { userId, labId: lab.id, status: ProgressStatus.IN_PROGRESS, completionPct: 0, startedAt: new Date() }, update: { status: ProgressStatus.IN_PROGRESS, completionPct: 0, lastTaskPosition: 0, completedAt: null } });
    return reset;
  });
}

export async function recordTaskProgress(userId: string, slug: string, position: number) {
  return prisma.$transaction(async (tx) => {
    const { lab, version } = await resolvePublishedLab(slug, tx);
    await ensureOperational(tx, userId);
    await ensureNotCompleted(tx, userId, lab.id);
    const task = version.tasks.find((entry) => entry.position === position);
    if (!task) throw new LabEngineError("TASK_NOT_FOUND", "Task position is not part of this lab version.", 404);
    const environment = await tx.labEnvironment.findUnique({ where: { userId_labId_labVersionId: { userId, labId: lab.id, labVersionId: version.id } } });
    if (!environment) throw new LabEngineError("ENVIRONMENT_NOT_STARTED", "Start the lab before recording task progress.", 409);
    const current = await tx.labProgress.findUnique({ where: { userId_labId: { userId, labId: lab.id } } });
    const lastTaskPosition = Math.max(current?.lastTaskPosition ?? 0, position);
    const completionPct = Math.min(99, Math.floor((lastTaskPosition / Math.max(version.tasks.length, 1)) * 100));
    return tx.labProgress.upsert({ where: { userId_labId: { userId, labId: lab.id } }, create: { userId, labId: lab.id, status: ProgressStatus.IN_PROGRESS, completionPct, lastTaskPosition, startedAt: new Date() }, update: { status: ProgressStatus.IN_PROGRESS, completionPct, lastTaskPosition } });
  });
}

export async function mutateEnvironment<T>(userId: string, environmentId: string, mutator: (state: Prisma.JsonObject) => { state: Prisma.InputJsonObject; result: T; resourceInventory?: Prisma.InputJsonValue }) {
  return prisma.$transaction(async (tx) => {
    await ensureOperational(tx, userId);
    const environment = await tx.labEnvironment.findFirst({ where: { id: environmentId, userId } });
    if (!environment) throw new LabEngineError("ENVIRONMENT_FORBIDDEN", "Environment not found for this user.", 404);
    if (environment.completedAt) throw new LabEngineError("LAB_ALREADY_COMPLETED", "This verified lab environment is locked against further mutation.", 409);
    await ensureNotCompleted(tx, userId, environment.labId);
    if (!environment.environmentState || typeof environment.environmentState !== "object" || Array.isArray(environment.environmentState)) throw new LabEngineError("INVALID_ENVIRONMENT_STATE", "The environment state is invalid.", 500);
    const outcome = mutator(cloneJson(environment.environmentState) as Prisma.JsonObject);
    const updated = await tx.labEnvironment.update({ where: { id: environment.id }, data: { environmentState: outcome.state, ...(outcome.resourceInventory !== undefined ? { resourceInventory: outcome.resourceInventory } : {}) } });
    return { environment: updated, result: outcome.result };
  });
}
