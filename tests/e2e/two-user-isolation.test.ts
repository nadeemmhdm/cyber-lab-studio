import { randomUUID } from "node:crypto";
import { LearningMode } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getWorkspace, LabEngineError, startLab } from "@/lib/labs/engine";
import { prisma } from "@/lib/prisma";
import { executePersistedAwsCommand } from "@/lib/simulators/aws/persistence";

const suffix = randomUUID().slice(0, 8);
let userA = "";
let userB = "";
let environmentA = "";
let environmentB = "";

beforeAll(async () => {
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { email: `e2e-a-${suffix}@example.test`, displayName: "E2E Student A", emailVerifiedAt: new Date() } }),
    prisma.user.create({ data: { email: `e2e-b-${suffix}@example.test`, displayName: "E2E Student B", emailVerifiedAt: new Date() } }),
  ]);
  userA = a.id;
  userB = b.id;
  const [labA, labB] = await Promise.all([
    startLab(userA, "aws-iam-users-roles", LearningMode.PRACTICE),
    startLab(userB, "aws-iam-users-roles", LearningMode.PRACTICE),
  ]);
  environmentA = labA.environment.id;
  environmentB = labB.environment.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userA, userB].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe("release E2E: two-user environment isolation", () => {
  it("creates separate environments for the same published AWS lab", async () => {
    expect(environmentA).not.toBe(environmentB);
    const [a, b] = await Promise.all([
      getWorkspace(userA, "aws-iam-users-roles"),
      getWorkspace(userB, "aws-iam-users-roles"),
    ]);
    expect(a?.environment.userId).toBe(userA);
    expect(b?.environment.userId).toBe(userB);
  });

  it("keeps an AWS mutation and command history inside the authenticated learner environment", async () => {
    const created = await executePersistedAwsCommand(userA, environmentA, "aws iam create-user --user-name release-isolation-user");
    expect(created.exitCode).toBe(0);

    const listA = await executePersistedAwsCommand(userA, environmentA, "aws iam list-users");
    const listB = await executePersistedAwsCommand(userB, environmentB, "aws iam list-users");
    expect(JSON.stringify(listA.output)).toContain("release-isolation-user");
    expect(JSON.stringify(listB.output)).not.toContain("release-isolation-user");

    const [historyA, historyB] = await Promise.all([
      prisma.terminalHistory.findMany({ where: { userId: userA, environmentId: environmentA } }),
      prisma.terminalHistory.findMany({ where: { userId: userB, environmentId: environmentB } }),
    ]);
    expect(historyA.some((entry) => entry.command.includes("release-isolation-user"))).toBe(true);
    expect(historyB.some((entry) => entry.command.includes("release-isolation-user"))).toBe(false);
  });

  it("rejects cross-user access even when the other environment ID is known", async () => {
    await expect(executePersistedAwsCommand(userB, environmentA, "aws iam list-users")).rejects.toMatchObject({ code: "ENVIRONMENT_FORBIDDEN" } satisfies Partial<LabEngineError>);
  });
});
