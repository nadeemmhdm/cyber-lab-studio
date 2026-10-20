import { randomUUID } from "node:crypto";
import { Difficulty, LearningMode, Platform, RoleType } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getInstructorOverview, assignStudent, getAdminOverview, updateLabManagement, updatePlatformControls, updateUserAccess } from "@/lib/management/service";
import { startLab, recordTaskProgress } from "@/lib/labs/engine";
import { DEFAULT_PLATFORM_CONTROLS } from "@/lib/platform/settings";
import { prisma } from "@/lib/prisma";

const suffix = randomUUID().slice(0, 8);
let adminId = "";
let instructorId = "";
let studentId = "";
let otherStudentId = "";
let tempLabId = "";

async function createUser(name: string, roleKey: RoleType) {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  return prisma.user.create({ data: { email: `phase10-${name}-${suffix}@example.test`, displayName: `Phase10 ${name}`, roles: { create: { roleId: role.id } } } });
}

beforeAll(async () => {
  const [admin, instructor, student, other] = await Promise.all([
    createUser("admin", RoleType.ADMIN), createUser("instructor", RoleType.INSTRUCTOR), createUser("student", RoleType.STUDENT), createUser("other", RoleType.STUDENT),
  ]);
  adminId = admin.id; instructorId = instructor.id; studentId = student.id; otherStudentId = other.id;

  const lab = await prisma.lab.create({ data: { number: 999, slug: `phase10-${suffix}`, title: "Phase 10 Managed Lab", objective: "Management test lab", platform: Platform.FUNDAMENTALS, difficulty: Difficulty.BEGINNER, estimatedMinutes: 10, enabled: false, prerequisiteIds: [] } });
  tempLabId = lab.id;
  const version = await prisma.labVersion.create({ data: { labId: lab.id, version: 1, published: false, conceptExplanation: "Original concept", scenario: "Original scenario", prerequisites: [], supportedCommands: [], supportedUi: [], initialState: { revision: 0, resourceInventory: [] }, validationConfig: {} } });
  await prisma.labHint.create({ data: { labVersionId: version.id, level: 1, content: "Original hint" } });
  await prisma.labSolution.create({ data: { labVersionId: version.id, problem: "Problem", concept: "Concept", uiNavigation: "UI", commands: [], expectedOutput: "Expected", whyItWorks: "Because", securityConsequence: "Risk", verification: "Original verify", commonMistakes: "Original mistakes", troubleshooting: "Original trouble", summary: "Original summary" } });
});

afterAll(async () => {
  if (adminId) {
    await updatePlatformControls(adminId, {
      maintenanceEnabled: DEFAULT_PLATFORM_CONTROLS.maintenance.enabled,
      maintenanceMessage: DEFAULT_PLATFORM_CONTROLS.maintenance.message,
      maxActiveEnvironmentsPerUser: DEFAULT_PLATFORM_CONTROLS.quota.maxActiveEnvironmentsPerUser,
      allowedModes: DEFAULT_PLATFORM_CONTROLS.learning.allowedModes,
      showHints: true,
      showSolutions: true,
    }).catch(() => undefined);
  }
  if (tempLabId) await prisma.lab.deleteMany({ where: { id: tempLabId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, instructorId, studentId, otherStudentId].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe("Phase 10 instructor and admin management", () => {
  it("scopes instructor progress to assigned students", async () => {
    await assignStudent(adminId, instructorId, studentId);
    const assigned = await getInstructorOverview(instructorId);
    expect(assigned.map((entry) => entry.id)).toContain(studentId);
    expect(assigned.map((entry) => entry.id)).not.toContain(otherStudentId);
  });

  it("updates roles and suspension with audit records", async () => {
    const updated = await updateUserAccess(adminId, otherStudentId, { roles: [RoleType.INSTRUCTOR], suspended: true });
    expect(updated.suspendedAt).not.toBeNull();
    expect(updated.roles.map((entry) => entry.role.key)).toEqual([RoleType.INSTRUCTOR]);
    const audit = await prisma.auditLog.findFirst({ where: { actorId: adminId, action: "management.user.access.updated", targetId: otherStudentId } });
    expect(audit).not.toBeNull();
    await updateUserAccess(adminId, otherStudentId, { roles: [RoleType.STUDENT], suspended: false });
  });

  it("enforces learning visibility, mode controls, quotas, and maintenance in the lab engine", async () => {
    await updatePlatformControls(adminId, { maxActiveEnvironmentsPerUser: 1, allowedModes: [LearningMode.GUIDED], showHints: false, showSolutions: false, maintenanceEnabled: false });
    const started = await startLab(studentId, "cloud-security-fundamentals", LearningMode.GUIDED);
    expect(started.policy.showHints).toBe(false);
    expect(started.policy.showSolution).toBe(false);
    await expect(startLab(studentId, "cloud-security-fundamentals", LearningMode.PRACTICE)).rejects.toMatchObject({ code: "LEARNING_MODE_DISABLED" });
    await expect(startLab(studentId, "cloud-iam-fundamentals", LearningMode.GUIDED)).rejects.toMatchObject({ code: "ENVIRONMENT_QUOTA_REACHED" });
    await updatePlatformControls(adminId, { maintenanceEnabled: true, maintenanceMessage: "Maintenance test" });
    await expect(recordTaskProgress(studentId, "cloud-security-fundamentals", 1)).rejects.toMatchObject({ code: "MAINTENANCE_MODE" });
    await updatePlatformControls(adminId, { maintenanceEnabled: false, maxActiveEnvironmentsPerUser: 8, allowedModes: [LearningMode.GUIDED, LearningMode.PRACTICE, LearningMode.CHALLENGE], showHints: true, showSolutions: true });
  });

  it("manages lab, version, hint, and solution content through one audited service", async () => {
    const lab = await prisma.lab.findUniqueOrThrow({ where: { id: tempLabId }, include: { versions: { include: { hints: true, solution: true } } } });
    const version = lab.versions[0];
    const result = await updateLabManagement(adminId, tempLabId, {
      enabled: true,
      title: "Managed Lab Updated",
      version: { id: version.id, published: true, conceptExplanation: "Updated concept", scenario: "Updated scenario" },
      hint: { id: version.hints[0].id, content: "Updated hint" },
      solution: { id: version.solution!.id, summary: "Updated summary", verification: "Updated verification", commonMistakes: "Updated mistakes", troubleshooting: "Updated troubleshooting" },
    });
    expect(result.enabled).toBe(true);
    expect(result.title).toBe("Managed Lab Updated");
    expect(result.versions[0].published).toBe(true);
    expect(result.versions[0].hints[0].content).toBe("Updated hint");
    expect(result.versions[0].solution?.summary).toBe("Updated summary");
  });

  it("exposes bounded operational health and audit data", async () => {
    const overview = await getAdminOverview();
    expect(overview.health.database).toBe("Operational");
    expect(overview.health.users).toBeGreaterThanOrEqual(4);
    expect(overview.users.length).toBeLessThanOrEqual(100);
    expect(overview.auditLogs.length).toBeLessThanOrEqual(100);
  });
});
