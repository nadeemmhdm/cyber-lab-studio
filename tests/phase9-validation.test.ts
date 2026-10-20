import { randomUUID } from "node:crypto";
import { LearningMode, ProgressStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLabEducationalContent } from "@/lib/labs/content";
import { submitLabForValidation } from "@/lib/labs/completion";
import { recordTaskProgress, resetLab, startLab } from "@/lib/labs/engine";
import { LAB_VALIDATOR_REGISTRY } from "@/lib/labs/validators";
import { prisma } from "@/lib/prisma";
import { executePersistedAwsCommand } from "@/lib/simulators/aws/persistence";
import { executePersistedKqlQuery } from "@/lib/simulators/security/persistence";

const suffix = randomUUID().slice(0, 8);
let userA = "";
let userB = "";

async function recordAllTasks(userId: string, slug: string) {
  for (const position of [1, 2, 3, 4]) await recordTaskProgress(userId, slug, position);
}

async function executeAwsSolution(userId: string, slug: string, labNumber: number) {
  const workspace = await startLab(userId, slug, LearningMode.GUIDED);
  await recordAllTasks(userId, slug);
  for (const item of getLabEducationalContent(labNumber).solution.commands) {
    if (!item.command.startsWith("aws ")) continue;
    const result = await executePersistedAwsCommand(userId, workspace.environment.id, item.command);
    expect(result.exitCode).toBe(0);
  }
}

beforeAll(async () => {
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { email: `phase9-a-${suffix}@example.test`, displayName: "Phase9 A" } }),
    prisma.user.create({ data: { email: `phase9-b-${suffix}@example.test`, displayName: "Phase9 B" } }),
  ]);
  userA = a.id;
  userB = b.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userA, userB].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe("Phase 9 validation, flags, and achievements", () => {
  it("registers a validator profile for all 30 labs", () => {
    expect(Object.keys(LAB_VALIDATOR_REGISTRY).map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it("does not issue completion or flag when server evidence is incomplete", async () => {
    await startLab(userA, "aws-iam-users-roles", LearningMode.GUIDED);
    await recordAllTasks(userA, "aws-iam-users-roles");
    const result = await submitLabForValidation(userA, "aws-iam-users-roles");
    expect(result.passed).toBe(false);
    expect(result.completed).toBe(false);
    expect("flag" in result).toBe(false);
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("aws iam");
    expect(serialized).not.toContain("phase8.lab");
    expect(serialized).not.toContain("validatorkey");
    const lab = await prisma.lab.findUniqueOrThrow({ where: { slug: "aws-iam-users-roles" } });
    expect(await prisma.completionRecord.findUnique({ where: { userId_labId: { userId: userA, labId: lab.id } } })).toBeNull();
    expect(await prisma.flag.findUnique({ where: { userId_labId: { userId: userA, labId: lab.id } } })).toBeNull();
  });

  it("validates real AWS evidence transactionally and reuses the same flag idempotently", async () => {
    const workspace = await prisma.labEnvironment.findFirstOrThrow({ where: { userId: userA, lab: { slug: "aws-iam-users-roles" } } });
    for (const item of getLabEducationalContent(3).solution.commands) {
      if (!item.command.startsWith("aws ")) continue;
      const result = await executePersistedAwsCommand(userA, workspace.id, item.command);
      expect(result.exitCode).toBe(0);
    }

    const result = await submitLabForValidation(userA, "aws-iam-users-roles");
    expect(result.passed).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.flag).toMatch(/^CYBERLAB\{[A-Za-z0-9_-]{32}\}$/);
    expect(result.achievements.map((item) => item.key)).toContain("FIRST_VALIDATED_LAB");

    const lab = await prisma.lab.findUniqueOrThrow({ where: { slug: "aws-iam-users-roles" } });
    const progress = await prisma.labProgress.findUniqueOrThrow({ where: { userId_labId: { userId: userA, labId: lab.id } } });
    expect(progress.status).toBe(ProgressStatus.COMPLETED);
    expect(progress.completionPct).toBe(100);
    const attempt = await prisma.labAttempt.findFirstOrThrow({ where: { userId: userA, labId: lab.id }, orderBy: { startedAt: "desc" }, include: { validationResult: true } });
    expect(attempt.status).toBe("PASSED");
    expect(attempt.validationResult?.passed).toBe(true);

    const again = await submitLabForValidation(userA, "aws-iam-users-roles");
    expect(again.flag).toBe(result.flag);
    expect(await prisma.flag.count({ where: { userId: userA, labId: lab.id } })).toBe(1);
  });

  it("locks verified labs against restart, reset, task writes, and simulator mutation", async () => {
    const environment = await prisma.labEnvironment.findFirstOrThrow({ where: { userId: userA, lab: { slug: "aws-iam-users-roles" } } });
    await expect(startLab(userA, "aws-iam-users-roles", LearningMode.GUIDED)).rejects.toMatchObject({ code: "LAB_ALREADY_COMPLETED" });
    await expect(resetLab(userA, "aws-iam-users-roles")).rejects.toMatchObject({ code: "LAB_ALREADY_COMPLETED" });
    await expect(recordTaskProgress(userA, "aws-iam-users-roles", 4)).rejects.toMatchObject({ code: "LAB_ALREADY_COMPLETED" });
    await expect(executePersistedAwsCommand(userA, environment.id, "aws sts get-caller-identity")).rejects.toMatchObject({ code: "LAB_ALREADY_COMPLETED" });
  });

  it("issues different cryptographic flags to different students for the same lab", async () => {
    await executeAwsSolution(userB, "aws-iam-users-roles", 3);
    const resultB = await submitLabForValidation(userB, "aws-iam-users-roles");
    const resultA = await submitLabForValidation(userA, "aws-iam-users-roles");
    expect(resultB.passed).toBe(true);
    expect(resultB.flag).toMatch(/^CYBERLAB\{[A-Za-z0-9_-]{32}\}$/);
    expect(resultB.flag).not.toBe(resultA.flag);
  });

  it("validates KQL labs from successful persisted query evidence", async () => {
    const workspace = await startLab(userA, "kql-fundamentals", LearningMode.GUIDED);
    await recordAllTasks(userA, "kql-fundamentals");
    for (const item of getLabEducationalContent(25).solution.commands) {
      if (!item.command.includes(" | ")) continue;
      const result = await executePersistedKqlQuery(userA, workspace.environment.id, item.command);
      expect(result.rowCount).toBeGreaterThan(0);
    }
    const result = await submitLabForValidation(userA, "kql-fundamentals");
    expect(result.passed).toBe(true);
    expect(result.flag).toMatch(/^CYBERLAB\{[A-Za-z0-9_-]{32}\}$/);
  });

  it("awards challenge achievement only from a passed server validation", async () => {
    await startLab(userA, "cloud-iam-fundamentals", LearningMode.CHALLENGE);
    await recordAllTasks(userA, "cloud-iam-fundamentals");
    const result = await submitLabForValidation(userA, "cloud-iam-fundamentals");
    expect(result.passed).toBe(true);
    expect(result.achievements.map((item) => item.key)).toContain("CHALLENGE_VERIFIED");
    const earned = await prisma.userAchievement.findMany({ where: { userId: userA }, include: { achievement: true } });
    expect(earned.map((entry) => entry.achievement.key)).toContain("CHALLENGE_VERIFIED");
  });
});
