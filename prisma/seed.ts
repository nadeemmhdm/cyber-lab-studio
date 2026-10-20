import { Difficulty, Platform, PrismaClient, RoleType } from "@prisma/client";
import { KQL_SUPPORTED_OPERATORS } from "../lib/kql/engine";
import { getLabEducationalContent } from "../lib/labs/content";
import { LABS } from "../lib/labs/catalog";
import { AWS_SUPPORTED_COMMANDS } from "../lib/simulators/aws/engine";
import { createInitialAwsState } from "../lib/simulators/aws/initial-state";
import { AZURE_SUPPORTED_COMMANDS, createInitialAzureState } from "../lib/simulators/azure/engine";
import { createInitialSecurityState } from "../lib/simulators/security/engine";
import type { SecurityPlatform } from "../lib/simulators/security/types";

const prisma = new PrismaClient();

function runtimeForLab(labDefinition: (typeof LABS)[number]) {
  const isAws = labDefinition.platform === "AWS";
  const isAzure = labDefinition.platform === "AZURE";
  const isSecurity = ["SENTINEL", "KQL", "DEFENDER_XDR"].includes(labDefinition.platform);
  const initialState = isAws
    ? createInitialAwsState(labDefinition.number)
    : isAzure
      ? createInitialAzureState(labDefinition.number)
      : isSecurity
        ? createInitialSecurityState(labDefinition.number, labDefinition.platform as SecurityPlatform)
        : { schemaVersion: 1, labNumber: labDefinition.number, platform: labDefinition.platform, revision: 0, notes: [], resourceInventory: [] };
  const supportedCommands = isAws
    ? AWS_SUPPORTED_COMMANDS.map((key) => `aws ${key.replace(".", " ")}`)
    : isAzure
      ? AZURE_SUPPORTED_COMMANDS.map((key) => `az ${key.replace(".", " ")}`)
      : isSecurity
        ? KQL_SUPPORTED_OPERATORS.map((operator) => `KQL:${operator}`)
        : [];
  const supportedUi = [
    "workspace", "mode-selection", "task-progress", "reset-environment", "hints", "solution", "troubleshooting",
    ...(isAws ? ["aws-terminal", "resource-state", "security-findings"] : []),
    ...(isAzure ? ["azure-terminal", "resource-state", "activity-log", "security-findings"] : []),
    ...(isSecurity ? ["kql-console", "security-datasets", "attack-timeline"] : []),
    ...(labDefinition.platform === "SENTINEL" ? ["sentinel-analytics", "sentinel-alerts", "sentinel-incidents"] : []),
    ...(labDefinition.platform === "DEFENDER_XDR" ? ["defender-alerts", "defender-incidents", "devices", "identities", "processes", "network-connections"] : []),
  ];
  const phase = isSecurity ? 7 : isAzure ? 6 : isAws ? 5 : 4;
  const simulatorName = labDefinition.platform === "DEFENDER_XDR" ? "Defender XDR" : labDefinition.platform === "SENTINEL" ? "Microsoft Sentinel" : labDefinition.platform === "KQL" ? "KQL security data" : isAzure ? "Azure" : isAws ? "AWS" : labDefinition.platform.replaceAll("_", " ");
  return { isAws, isAzure, isSecurity, initialState, supportedCommands, supportedUi, phase, simulatorName };
}

async function seedLegacyVersion(labId: string, labDefinition: (typeof LABS)[number], runtime: ReturnType<typeof runtimeForLab>) {
  const version = await prisma.labVersion.upsert({
    where: { labId_version: { labId, version: 1 } },
    update: { published: true },
    create: {
      labId,
      version: 1,
      published: true,
      conceptExplanation: runtime.isAws || runtime.isAzure || runtime.isSecurity
        ? `This lab runs inside the native CyberLab ${runtime.simulatorName} engine. Supported operations inspect and mutate only your persisted training environment.`
        : `This runtime version provides the isolated simulator foundation for ${labDefinition.title}.`,
      scenario: runtime.isSecurity
        ? "Investigate a deterministic multi-stage attack using shared synthetic identity, endpoint, network, and cloud audit data."
        : runtime.isAws || runtime.isAzure
          ? `Investigate and harden a deterministic simulated ${runtime.simulatorName} environment for ${labDefinition.title}.`
          : `Work inside your own deterministic ${runtime.simulatorName} training environment.`,
      prerequisites: [],
      supportedCommands: runtime.supportedCommands,
      supportedUi: runtime.supportedUi,
      initialState: runtime.initialState,
      validationConfig: { phase: runtime.phase, completionRequiresServerValidation: true, legacyCurriculum: true },
    },
  });

  const prefix = labDefinition.platform === "SENTINEL" ? "sentinel" : labDefinition.platform === "KQL" ? "kql" : labDefinition.platform === "DEFENDER_XDR" ? "defender" : runtime.isAzure ? "azure" : runtime.isAws ? "aws" : "foundation";
  const tasks = [
    { position: 1, title: "Inspect the environment", instruction: "Review the isolated initial state and identify the evidence available in the workspace.", validatorKey: `${prefix}.inspect` },
    { position: 2, title: "Perform the lab action", instruction: "Use only supported simulator or investigation operations to make or justify the required security change.", validatorKey: `${prefix}.change` },
    { position: 3, title: "Verify the result", instruction: "Re-read persisted state or telemetry and prepare the result for server-side validation.", validatorKey: `${prefix}.verify` },
  ];
  for (const task of tasks) {
    await prisma.labTask.upsert({
      where: { labVersionId_position: { labVersionId: version.id, position: task.position } },
      update: { title: task.title, instruction: task.instruction, validatorKey: task.validatorKey },
      create: { labVersionId: version.id, ...task },
    });
  }
}

async function seedEducationalVersion(labId: string, labDefinition: (typeof LABS)[number], runtime: ReturnType<typeof runtimeForLab>) {
  const content = getLabEducationalContent(labDefinition.number);
  const version = await prisma.labVersion.upsert({
    where: { labId_version: { labId, version: 2 } },
    update: {
      published: true,
      conceptExplanation: content.conceptExplanation,
      scenario: content.scenario,
      prerequisites: content.prerequisites,
      supportedCommands: runtime.supportedCommands,
      supportedUi: runtime.supportedUi,
      initialState: runtime.initialState,
      validationConfig: { phase: 8, completionRequiresServerValidation: true, curriculumVersion: 2 },
    },
    create: {
      labId,
      version: 2,
      published: true,
      conceptExplanation: content.conceptExplanation,
      scenario: content.scenario,
      prerequisites: content.prerequisites,
      supportedCommands: runtime.supportedCommands,
      supportedUi: runtime.supportedUi,
      initialState: runtime.initialState,
      validationConfig: { phase: 8, completionRequiresServerValidation: true, curriculumVersion: 2 },
    },
  });

  for (const task of content.tasks) {
    await prisma.labTask.upsert({
      where: { labVersionId_position: { labVersionId: version.id, position: task.position } },
      update: { title: task.title, instruction: task.instruction, validatorKey: task.validatorKey },
      create: { labVersionId: version.id, ...task },
    });
  }

  for (let index = 0; index < content.hints.length; index += 1) {
    const level = index + 1;
    await prisma.labHint.upsert({
      where: { labVersionId_level: { labVersionId: version.id, level } },
      update: { content: content.hints[index] },
      create: { labVersionId: version.id, level, content: content.hints[index] },
    });
  }

  await prisma.labSolution.upsert({
    where: { labVersionId: version.id },
    update: {
      problem: content.solution.problem,
      concept: content.solution.concept,
      uiNavigation: content.solution.uiNavigation,
      commands: content.solution.commands,
      expectedOutput: content.solution.expectedOutput,
      whyItWorks: content.solution.whyItWorks,
      securityConsequence: content.solution.securityConsequence,
      verification: content.solution.verification,
      commonMistakes: content.solution.commonMistakes,
      troubleshooting: content.solution.troubleshooting,
      summary: content.solution.summary,
    },
    create: {
      labVersionId: version.id,
      problem: content.solution.problem,
      concept: content.solution.concept,
      uiNavigation: content.solution.uiNavigation,
      commands: content.solution.commands,
      expectedOutput: content.solution.expectedOutput,
      whyItWorks: content.solution.whyItWorks,
      securityConsequence: content.solution.securityConsequence,
      verification: content.solution.verification,
      commonMistakes: content.solution.commonMistakes,
      troubleshooting: content.solution.troubleshooting,
      summary: content.solution.summary,
    },
  });
}

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
    const runtime = runtimeForLab(labDefinition);
    await seedLegacyVersion(lab.id, labDefinition, runtime);
    await seedEducationalVersion(lab.id, labDefinition, runtime);
  }

  console.log(`Seeded ${roles.length} roles, ${LABS.length} labs, legacy runtime versions, and Phase 8 curriculum Version 2 with tasks, three-level hints, and complete solutions.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
