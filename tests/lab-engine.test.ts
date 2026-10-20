import { randomUUID } from "node:crypto";
import { LearningMode, Prisma, ProgressStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getModePolicy, getWorkspace, LabEngineError, mutateEnvironment, recordTaskProgress, resetLab, startLab } from "@/lib/labs/engine";
import { prisma } from "@/lib/prisma";

const suffix = randomUUID().slice(0, 8);
let userA = "";
let userB = "";

beforeAll(async () => {
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { email: `phase4-a-${suffix}@example.test`, displayName: "Phase4 A" } }),
    prisma.user.create({ data: { email: `phase4-b-${suffix}@example.test`, displayName: "Phase4 B" } }),
  ]);
  userA = a.id;
  userB = b.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userA, userB].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe("Phase 4 lab engine", () => {
  it("creates isolated environments for two students", async () => {
    const a = await startLab(userA, "cloud-security-fundamentals", LearningMode.GUIDED);
    const b = await startLab(userB, "cloud-security-fundamentals", LearningMode.CHALLENGE);
    expect(a.environment.id).not.toBe(b.environment.id);
    expect(a.environment.userId).toBe(userA);
    expect(b.environment.userId).toBe(userB);
    expect(a.policy.showHints).toBe(true);
    expect(b.policy.showHints).toBe(false);
  });

  it("persists state only inside the authenticated user's environment", async () => {
    const workspaceA = await getWorkspace(userA, "cloud-security-fundamentals");
    const workspaceB = await getWorkspace(userB, "cloud-security-fundamentals");
    expect(workspaceA).not.toBeNull();
    expect(workspaceB).not.toBeNull();

    await mutateEnvironment(userA, workspaceA!.environment.id, (state) => ({
      state: { ...state, revision: 42 } as Prisma.InputJsonObject,
      result: "changed",
    }));

    const afterA = await getWorkspace(userA, "cloud-security-fundamentals");
    const afterB = await getWorkspace(userB, "cloud-security-fundamentals");
    expect((afterA!.environment.environmentState as Prisma.JsonObject).revision).toBe(42);
    expect((afterB!.environment.environmentState as Prisma.JsonObject).revision).toBe(0);

    await expect(mutateEnvironment(userB, workspaceA!.environment.id, (state) => ({ state: state as Prisma.InputJsonObject, result: null }))).rejects.toMatchObject({ code: "ENVIRONMENT_FORBIDDEN" } satisfies Partial<LabEngineError>);
  });

  it("resets deterministically to the published initial state", async () => {
    const before = await getWorkspace(userA, "cloud-security-fundamentals");
    const reset = await resetLab(userA, "cloud-security-fundamentals");
    expect(reset.resetCount).toBeGreaterThan(before!.environment.resetCount);
    const after = await getWorkspace(userA, "cloud-security-fundamentals");
    expect(after!.environment.environmentState).toEqual(after!.version.initialState);
  });

  it("tracks four-task curriculum progress without granting completion from a button", async () => {
    const thirdTask = await recordTaskProgress(userA, "cloud-security-fundamentals", 3);
    expect(thirdTask.lastTaskPosition).toBe(3);
    expect(thirdTask.completionPct).toBe(75);
    expect(thirdTask.status).toBe(ProgressStatus.IN_PROGRESS);

    const finalTask = await recordTaskProgress(userA, "cloud-security-fundamentals", 4);
    expect(finalTask.lastTaskPosition).toBe(4);
    expect(finalTask.completionPct).toBe(99);
    expect(finalTask.status).toBe(ProgressStatus.IN_PROGRESS);

    const completion = await prisma.completionRecord.findUnique({ where: { userId_labId: { userId: userA, labId: finalTask.labId } } });
    expect(completion).toBeNull();
  });

  it("defines mode policy explicitly", () => {
    expect(getModePolicy(LearningMode.GUIDED)).toEqual({ showConcepts: true, showHints: true, showSolution: true });
    expect(getModePolicy(LearningMode.CHALLENGE)).toEqual({ showConcepts: false, showHints: false, showSolution: false });
  });
});
