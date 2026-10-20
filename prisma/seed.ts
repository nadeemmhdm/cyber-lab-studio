import { Difficulty, Platform, PrismaClient, RoleType } from "@prisma/client";
import { KQL_SUPPORTED_OPERATORS } from "../lib/kql/engine";
import { LABS } from "../lib/labs/catalog";
import { AWS_SUPPORTED_COMMANDS } from "../lib/simulators/aws/engine";
import { createInitialAwsState } from "../lib/simulators/aws/initial-state";
import { AZURE_SUPPORTED_COMMANDS, createInitialAzureState } from "../lib/simulators/azure/engine";
import { createInitialSecurityState } from "../lib/simulators/security/engine";
import type { SecurityPlatform } from "../lib/simulators/security/types";

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
      "workspace", "mode-selection", "task-progress", "reset-environment",
      ...(isAws ? ["aws-terminal", "resource-state", "security-findings"] : []),
      ...(isAzure ? ["azure-terminal", "resource-state", "activity-log", "security-findings"] : []),
      ...(isSecurity ? ["kql-console", "security-datasets", "attack-timeline"] : []),
      ...(labDefinition.platform === "SENTINEL" ? ["sentinel-analytics", "sentinel-alerts", "sentinel-incidents"] : []),
      ...(labDefinition.platform === "DEFENDER_XDR" ? ["defender-alerts", "defender-incidents", "devices", "identities", "processes", "network-connections"] : []),
    ];
    const phase = isSecurity ? 7 : isAzure ? 6 : isAws ? 5 : 4;
    const simulatorName = labDefinition.platform === "DEFENDER_XDR" ? "Defender XDR" : labDefinition.platform === "SENTINEL" ? "Microsoft Sentinel" : labDefinition.platform === "KQL" ? "KQL security data" : isAzure ? "Azure" : isAws ? "AWS" : labDefinition.platform.replaceAll("_", " ");

    const version = await prisma.labVersion.upsert({
      where: { labId_version: { labId: lab.id, version: 1 } },
      update: {
        published: true,
        conceptExplanation: isAws || isAzure || isSecurity
          ? `This lab runs inside the native CyberLab ${simulatorName} engine. Supported operations inspect and mutate only your persisted training environment.`
          : `This runtime version provides the isolated simulator foundation for ${labDefinition.title}.`,
        scenario: isSecurity
          ? `Investigate a deterministic multi-stage attack using shared synthetic identity, endpoint, network, and cloud audit data. KQL executes against stored rows; Sentinel detections and Defender correlations use the same event IDs.`
          : isAws || isAzure
            ? `Investigate and harden a deterministic simulated ${simulatorName} environment for ${labDefinition.title}. Commands are never sent to a host shell or real cloud account.`
            : `Work inside your own deterministic ${simulatorName} training environment. Changes are persisted only to your lab state and can be reset safely.`,
        prerequisites: [], supportedCommands, supportedUi, initialState,
        validationConfig: { phase, completionRequiresServerValidation: true },
      },
      create: {
        labId: lab.id, version: 1, published: true,
        conceptExplanation: isAws || isAzure || isSecurity
          ? `This lab runs inside the native CyberLab ${simulatorName} engine. Supported operations inspect and mutate only your persisted training environment.`
          : `This runtime version provides the isolated simulator foundation for ${labDefinition.title}.`,
        scenario: isSecurity
          ? `Investigate a deterministic multi-stage attack using shared synthetic identity, endpoint, network, and cloud audit data. KQL executes against stored rows; Sentinel detections and Defender correlations use the same event IDs.`
          : isAws || isAzure
            ? `Investigate and harden a deterministic simulated ${simulatorName} environment for ${labDefinition.title}. Commands are never sent to a host shell or real cloud account.`
            : `Work inside your own deterministic ${simulatorName} training environment. Changes are persisted only to your lab state and can be reset safely.`,
        prerequisites: [], supportedCommands, supportedUi, initialState,
        validationConfig: { phase, completionRequiresServerValidation: true },
      },
    });

    const simulatorPrefix = labDefinition.platform === "SENTINEL" ? "sentinel" : labDefinition.platform === "KQL" ? "kql" : labDefinition.platform === "DEFENDER_XDR" ? "defender" : isAzure ? "azure" : isAws ? "aws" : "foundation";
    const tasks = [
      { position: 1, title: "Inspect the environment", instruction: isSecurity ? "Inspect the available security tables, incidents, alerts, entities, devices, and timeline without relying on hidden validation data." : "Review the versioned initial state and identify the resources available in your isolated workspace.", validatorKey: `${simulatorPrefix}.inspect` },
      { position: 2, title: "Perform the lab action", instruction: isSecurity ? "Use real KQL evaluation and the platform investigation/detection workflow to identify or process the required threat activity." : isAws || isAzure ? `Use the documented simulated ${simulatorName} CLI commands to make the required security change. The command must change actual simulator state.` : "Use the supported simulator operations for this lab to make the required security change.", validatorKey: `${simulatorPrefix}.change` },
      { position: 3, title: "Verify the result", instruction: isSecurity ? "Verify your findings from stored events, correlated entities, alerts/incidents, and query results before server-side validation." : isAws || isAzure ? `Re-run list/show/findings commands to verify the persisted ${simulatorName} state before server-side validation.` : "Review the resulting state and prepare it for server-side validation.", validatorKey: `${simulatorPrefix}.verify` },
    ];
    for (const task of tasks) {
      await prisma.labTask.upsert({ where: { labVersionId_position: { labVersionId: version.id, position: task.position } }, update: { title: task.title, instruction: task.instruction, validatorKey: task.validatorKey }, create: { labVersionId: version.id, ...task } });
    }
  }

  console.log(`Seeded ${roles.length} roles, ${LABS.length} labs, Phase 4 engine, Phase 5 AWS, Phase 6 Azure, and Phase 7 security operations state.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
