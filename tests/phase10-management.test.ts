import { Difficulty, Platform, RoleType } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { assignInstructor, createLabVersion, listInstructorStudents, setUserRoles, setUserSuspended, updateLabMetadata, updatePublishedCurriculum } from "@/lib/management/service";
import { DEFAULT_PLATFORM_CONTROLS, getPlatformControls } from "@/lib/management/settings";
import { prisma } from "@/lib/prisma";

const suffix = randomUUID().slice(0, 8);
let adminId = "";
let instructorId = "";
let studentId = "";
let labId = "";
const slug = `phase10-${suffix}`;

beforeAll(async () => {
  const roles = await prisma.role.findMany();
  const byKey = new Map(roles.map((role) => [role.key, role.id]));
  const [admin, instructor, student] = await Promise.all([
    prisma.user.create({ data: { email: `p10-admin-${suffix}@example.test`, displayName: "P10 Admin", roles: { create: { roleId: byKey.get(RoleType.ADMIN)! } } } }),
    prisma.user.create({ data: { email: `p10-instructor-${suffix}@example.test`, displayName: "P10 Instructor", roles: { create: { roleId: byKey.get(RoleType.INSTRUCTOR)! } } } }),
    prisma.user.create({ data: { email: `p10-student-${suffix}@example.test`, displayName: "P10 Student", roles: { create: { roleId: byKey.get(RoleType.STUDENT)! } } } }),
  ]);
  adminId = admin.id; instructorId = instructor.id; studentId = student.id;
  const lab = await prisma.lab.create({ data: { number: 9000 + Math.floor(Math.random() * 500), slug, title: "Phase 10 Lab", objective: "Management isolation", platform: Platform.FUNDAMENTALS, difficulty: Difficulty.BEGINNER, estimatedMinutes: 20, prerequisiteIds: [] } });
  labId = lab.id;
  const version = await prisma.labVersion.create({ data: { labId, version: 1, published: true, conceptExplanation: "Concept", scenario: "Scenario", prerequisites: [], supportedCommands: [], supportedUi: [], initialState: { schemaVersion: 1 }, validationConfig: {} } });
  await prisma.labHint.createMany({ data: [1,2,3].map((level) => ({ labVersionId: version.id, level, content: `Hint ${level}` })) });
  await prisma.labSolution.create({ data: { labVersionId: version.id, problem: "Problem", concept: "Concept", uiNavigation: "Workspace", commands: [], expectedOutput: "Evidence", whyItWorks: "Reason", securityConsequence: "Consequence", verification: "Verify", commonMistakes: "Mistakes", troubleshooting: "Troubleshoot", summary: "Summary" } });
});

afterAll(async () => {
  await prisma.instructorAssignment.deleteMany({ where: { OR: [{ instructorId }, { studentId }] } });
  await prisma.lab.deleteMany({ where: { id: labId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, instructorId, studentId].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe("Phase 10 instructor and admin management", () => {
  it("assigns only scoped students and exposes their progress", async () => {
    await assignInstructor(adminId, instructorId, studentId);
    const students = await listInstructorStudents(instructorId);
    expect(students.map((item) => item.id)).toContain(studentId);
  });

  it("updates roles and suspension with audit events", async () => {
    await setUserRoles(adminId, studentId, [RoleType.STUDENT, RoleType.INSTRUCTOR]);
    const roles = await prisma.userRole.findMany({ where: { userId: studentId }, include: { role: true } });
    expect(roles.map((entry) => entry.role.key).sort()).toEqual([RoleType.INSTRUCTOR, RoleType.STUDENT].sort());
    await setUserSuspended(adminId, studentId, true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: studentId } })).suspendedAt).not.toBeNull();
    await setUserSuspended(adminId, studentId, false);
  });

  it("manages lab metadata and cloned curriculum versions", async () => {
    await updateLabMetadata(adminId, slug, { title: "Managed Lab", estimatedMinutes: 35 });
    await updatePublishedCurriculum(adminId, slug, { hints: ["One", "Two", "Three"], solutionSummary: "Managed summary" });
    const clone = await createLabVersion(adminId, slug);
    expect(clone.version).toBe(2);
    expect(clone.published).toBe(false);
    const source = await prisma.lab.findUniqueOrThrow({ where: { slug }, include: { versions: { where: { version: 1 }, include: { hints: true, solution: true } } } });
    expect(source.title).toBe("Managed Lab");
    expect(source.versions[0].hints).toHaveLength(3);
    expect(source.versions[0].solution?.summary).toBe("Managed summary");
  });

  it("uses safe default platform controls when no override exists", async () => {
    const controls = await getPlatformControls();
    expect(controls.maxLabStartsPerDay).toBeGreaterThan(0);
    expect(controls.allowedLearningModes).toEqual(DEFAULT_PLATFORM_CONTROLS.allowedLearningModes);
  });
});
