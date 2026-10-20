import { Difficulty, Platform, PrismaClient, RoleType } from "@prisma/client";
import { LABS } from "../lib/labs/catalog";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { key: RoleType.STUDENT, name: "Student", description: "Learns and completes labs." },
    { key: RoleType.INSTRUCTOR, name: "Instructor", description: "Reviews assigned students and course progress." },
    { key: RoleType.ADMIN, name: "Admin", description: "Administers the CyberLab platform." },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  for (const labDefinition of LABS) {
    const lab = await prisma.lab.upsert({
      where: { number: labDefinition.number },
      update: {
        slug: labDefinition.slug,
        title: labDefinition.title,
        objective: labDefinition.objective,
        platform: labDefinition.platform as Platform,
        difficulty: labDefinition.difficulty as Difficulty,
        estimatedMinutes: labDefinition.estimatedMinutes,
        enabled: true,
        prerequisiteIds: [],
      },
      create: {
        number: labDefinition.number,
        slug: labDefinition.slug,
        title: labDefinition.title,
        objective: labDefinition.objective,
        platform: labDefinition.platform as Platform,
        difficulty: labDefinition.difficulty as Difficulty,
        estimatedMinutes: labDefinition.estimatedMinutes,
        enabled: true,
        prerequisiteIds: [],
      },
    });

    const initialState = {
      schemaVersion: 1,
      labNumber: labDefinition.number,
      platform: labDefinition.platform,
      revision: 0,
      notes: [],
      resourceInventory: [],
    };

    const version = await prisma.labVersion.upsert({
      where: { labId_version: { labId: lab.id, version: 1 } },
      update: {
        published: true,
        conceptExplanation: `This runtime version provides the isolated simulator foundation for ${labDefinition.title}.`,
        scenario: `Work inside your own deterministic ${labDefinition.platform.replaceAll("_", " ")} training environment. Changes are persisted only to your lab state and can be reset safely.`,
        prerequisites: [],
        supportedCommands: [],
        supportedUi: ["workspace", "mode-selection", "task-progress", "reset-environment"],
        initialState,
        validationConfig: { phase: 4, completionRequiresServerValidation: true },
      },
      create: {
        labId: lab.id,
        version: 1,
        published: true,
        conceptExplanation: `This runtime version provides the isolated simulator foundation for ${labDefinition.title}.`,
        scenario: `Work inside your own deterministic ${labDefinition.platform.replaceAll("_", " ")} training environment. Changes are persisted only to your lab state and can be reset safely.`,
        prerequisites: [],
        supportedCommands: [],
        supportedUi: ["workspace", "mode-selection", "task-progress", "reset-environment"],
        initialState,
        validationConfig: { phase: 4, completionRequiresServerValidation: true },
      },
    });

    const tasks = [
      { position: 1, title: "Inspect the environment", instruction: "Review the versioned initial state and identify the resources available in your isolated workspace.", validatorKey: "foundation.inspect" },
      { position: 2, title: "Perform the lab action", instruction: "Use the supported simulator operations for this lab to make the required security change.", validatorKey: "foundation.change" },
      { position: 3, title: "Verify the result", instruction: "Review the resulting state and prepare it for server-side validation.", validatorKey: "foundation.verify" },
    ];

    for (const task of tasks) {
      await prisma.labTask.upsert({
        where: { labVersionId_position: { labVersionId: version.id, position: task.position } },
        update: { title: task.title, instruction: task.instruction, validatorKey: task.validatorKey },
        create: { labVersionId: version.id, ...task },
      });
    }
  }

  console.log(`Seeded ${roles.length} roles, ${LABS.length} labs, versioned environments, and runtime tasks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
