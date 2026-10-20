import { Difficulty, Platform, PrismaClient, RoleType } from "@prisma/client";
import { LABS } from "../lib/labs/catalog";
import { AWS_SUPPORTED_COMMANDS } from "../lib/simulators/aws/engine";
import { createInitialAwsState } from "../lib/simulators/aws/initial-state";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { key: RoleType.STUDENT, name: "Student", description: "Learns and completes labs." },
    { key: RoleType.INSTRUCTOR, name: "Instructor", description: "Reviews assigned students and course progress." },
    { key: RoleType.ADMIN, name: "Admin", description: "Administers the CyberLab platform." },
  ];

  for (const role of roles) {
    await prisma.role.upsert({ where: { key: role.key }, update: { name: role.name, description: role.description }, create: role });
  }

  for (const labDefinition of LABS) {
    const lab = await prisma.lab.upsert({
      where: { number: labDefinition.number },
      update: { slug: labDefinition.slug, title: labDefinition.title, objective: labDefinition.objective, platform: labDefinition.platform as Platform, difficulty: labDefinition.difficulty as Difficulty, estimatedMinutes: labDefinition.estimatedMinutes, enabled: true, prerequisiteIds: [] },
      create: { number: labDefinition.number, slug: labDefinition.slug, title: labDefinition.title, objective: labDefinition.objective, platform: labDefinition.platform as Platform, difficulty: labDefinition.difficulty as Difficulty, estimatedMinutes: labDefinition.estimatedMinutes, enabled: true, prerequisiteIds: [] },
    });

    const isAws = labDefinition.platform === "AWS";
    const initialState = isAws ? createInitialAwsState(labDefinition.number) : { schemaVersion: 1, labNumber: labDefinition.number, platform: labDefinition.platform, revision: 0, notes: [], resourceInventory: [] };
    const supportedCommands = isAws ? AWS_SUPPORTED_COMMANDS.map((key) => `aws ${key.replace(".", " ")}`) : [];
    const supportedUi = ["workspace", "mode-selection", "task-progress", "reset-environment", ...(isAws ? ["aws-terminal", "resource-state", "security-findings"] : [])];

    const version = await prisma.labVersion.upsert({
      where: { labId_version: { labId: lab.id, version: 1 } },
      update: {
        published: true,
        conceptExplanation: isAws ? `This lab runs inside the native CyberLab AWS simulator. Supported AWS CLI operations inspect and mutate your own persisted training account state.` : `This runtime version provides the isolated simulator foundation for ${labDefinition.title}.`,
        scenario: isAws ? `Investigate and harden a deterministic simulated AWS account for ${labDefinition.title}. No command is sent to a host shell or real AWS account.` : `Work inside your own deterministic ${labDefinition.platform.replaceAll("_", " ")} training environment. Changes are persisted only to your lab state and can be reset safely.`,
        prerequisites: [], supportedCommands, supportedUi, initialState,
        validationConfig: { phase: isAws ? 5 : 4, completionRequiresServerValidation: true },
      },
      create: {
        labId: lab.id, version: 1, published: true,
        conceptExplanation: isAws ? `This lab runs inside the native CyberLab AWS simulator. Supported AWS CLI operations inspect and mutate your own persisted training account state.` : `This runtime version provides the isolated simulator foundation for ${labDefinition.title}.`,
        scenario: isAws ? `Investigate and harden a deterministic simulated AWS account for ${labDefinition.title}. No command is sent to a host shell or real AWS account.` : `Work inside your own deterministic ${labDefinition.platform.replaceAll("_", " ")} training environment. Changes are persisted only to your lab state and can be reset safely.`,
        prerequisites: [], supportedCommands, supportedUi, initialState,
        validationConfig: { phase: isAws ? 5 : 4, completionRequiresServerValidation: true },
      },
    });

    const tasks = [
      { position: 1, title: "Inspect the environment", instruction: "Review the versioned initial state and identify the resources available in your isolated workspace.", validatorKey: isAws ? "aws.inspect" : "foundation.inspect" },
      { position: 2, title: "Perform the lab action", instruction: isAws ? "Use the documented simulated AWS CLI commands to make the required security change. The command must change actual simulator state." : "Use the supported simulator operations for this lab to make the required security change.", validatorKey: isAws ? "aws.change" : "foundation.change" },
      { position: 3, title: "Verify the result", instruction: isAws ? "Re-run describe/list/findings commands to verify the persisted AWS state before server-side validation." : "Review the resulting state and prepare it for server-side validation.", validatorKey: isAws ? "aws.verify" : "foundation.verify" },
    ];
    for (const task of tasks) {
      await prisma.labTask.upsert({ where: { labVersionId_position: { labVersionId: version.id, position: task.position } }, update: { title: task.title, instruction: task.instruction, validatorKey: task.validatorKey }, create: { labVersionId: version.id, ...task } });
    }
  }

  console.log(`Seeded ${roles.length} roles, ${LABS.length} labs, Phase 4 environments, and Phase 5 AWS simulator state.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
