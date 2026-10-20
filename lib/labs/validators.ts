import type { Platform, Prisma } from "@prisma/client";
import { getLabEducationalContent } from "@/lib/labs/content";
import type { AwsSimulatorState } from "@/lib/simulators/aws/types";
import type { AzureSimulatorState } from "@/lib/simulators/azure/types";
import type { SecuritySimulatorState } from "@/lib/simulators/security/types";

export type PublicValidationCheck = { label: string; passed: boolean };

export type ValidationEvidence = {
  labNumber: number;
  platform: Platform;
  taskCount: number;
  lastTaskPosition: number;
  environmentState: Prisma.JsonValue;
  initialState: Prisma.JsonValue;
  terminalHistory: { command: string; exitCode: number }[];
  queryHistory: { query: string; rowCount: number; errorCode: string | null }[];
};

type ValidatorProfile = {
  strategy: "fundamentals" | "cli" | "security";
  stateCheck?: (state: Prisma.JsonValue) => boolean;
};

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stateRevision(value: Prisma.JsonValue) {
  const object = jsonObject(value);
  return typeof object?.revision === "number" ? object.revision : 0;
}

function solutionEvidence(number: number) {
  const commands = getLabEducationalContent(number).solution.commands.map((entry) => entry.command);
  return {
    cli: commands.filter((command) => /^aws\s|^az\s/i.test(command)),
    queries: commands.filter((command) => command.includes(" | ") && !command.startsWith("UI")),
    uiActions: commands.filter((command) => /^UI\s*→/i.test(command)),
  };
}

function isReadOnlyCli(command: string) {
  const value = normalize(command);
  if (value.startsWith("aws ")) {
    return /\s(describe|list|get|filter)-/.test(value) || value.startsWith("aws sts get-") || value.startsWith("aws s3 ls");
  }
  if (value.startsWith("az ")) {
    const operation = value.split(" --")[0];
    return /\s(list|show|get-instance-view)$/.test(operation);
  }
  return true;
}

function hasAllCliEvidence(evidence: ValidationEvidence) {
  const required = solutionEvidence(evidence.labNumber).cli;
  if (!required.length) return true;
  const successful = evidence.terminalHistory.filter((entry) => entry.exitCode === 0).map((entry) => normalize(entry.command));
  return required.every((command) => successful.includes(normalize(command)));
}

function hasAllQueryEvidence(evidence: ValidationEvidence) {
  const required = solutionEvidence(evidence.labNumber).queries;
  if (!required.length) return true;
  const successful = evidence.queryHistory.filter((entry) => !entry.errorCode && entry.rowCount > 0).map((entry) => normalize(entry.query));
  return required.every((query) => successful.includes(normalize(query)));
}

function isMutatingSecurityUiAction(command: string) {
  const value = normalize(command);
  return /run (sentinel )?detections/.test(value)
    || /add (an )?(analyst |investigation |final )?note/.test(value)
    || /update .*incident/.test(value)
    || /set .*incident.*(status|severity)/.test(value);
}

function mutationRequired(evidence: ValidationEvidence) {
  const required = solutionEvidence(evidence.labNumber);
  const mutatingUi = required.uiActions.some(isMutatingSecurityUiAction);
  return required.cli.some((command) => !isReadOnlyCli(command)) || mutatingUi;
}

function awsState(value: Prisma.JsonValue) {
  const state = value as unknown as AwsSimulatorState;
  return state?.kind === "aws" ? state : null;
}
function azureState(value: Prisma.JsonValue) {
  const state = value as unknown as AzureSimulatorState;
  return state?.kind === "azure" ? state : null;
}
function securityState(value: Prisma.JsonValue) {
  const state = value as unknown as SecuritySimulatorState;
  return state?.kind === "security" ? state : null;
}

function noPublicSsh(state: AwsSimulatorState) {
  return state.network.securityGroups.every((group) => group.ingress.every((rule) => !(rule.ipProtocol === "tcp" && rule.fromPort <= 22 && rule.toPort >= 22 && rule.cidrIp === "0.0.0.0/0")));
}
function fullyBlockedPublicS3(state: AwsSimulatorState) {
  return state.s3.buckets.every((bucket) => Object.values(bucket.publicAccessBlock).every(Boolean));
}
function hardenedAzureStorage(state: AzureSimulatorState) {
  return state.resources.storageAccounts.every((account) => account.httpsOnly && account.minimumTlsVersion === "TLS1_2" && !account.allowBlobPublicAccess && account.containers.every((container) => container.publicAccess === "off"));
}

export const LAB_VALIDATOR_REGISTRY: Readonly<Record<number, ValidatorProfile>> = {
  1: { strategy: "fundamentals" },
  2: { strategy: "fundamentals" },
  3: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); const user = s?.iam.users.find((entry) => entry.userName === "learner"); return Boolean(user?.groups.includes("SecurityStudents")); } },
  4: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); const policy = s?.iam.users.find((entry) => entry.userName === "analyst")?.inlinePolicies.LegacyAdmin; if (!s || !policy) return false; const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement]; return statements.every((statement) => statement.Action !== "*" && !(Array.isArray(statement.Action) && statement.Action.includes("*"))) && !s.findings.some((finding) => finding.id.startsWith("iam-wildcard-")); } },
  5: { strategy: "cli", stateCheck: (raw) => awsState(raw)?.iam.users.find((entry) => entry.userName === "analyst")?.accessKeys.some((key) => key.accessKeyId === "AKIASIM000000000001" && key.status === "Inactive") ?? false },
  6: { strategy: "cli", stateCheck: (raw) => (awsState(raw)?.network.vpcs.length ?? 0) >= 2 },
  7: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && s.network.subnets.length >= 2 && s.network.routeTables.length >= 2); } },
  8: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && noPublicSsh(s) && !s.findings.some((finding) => finding.id.startsWith("sg-public-ssh-"))); } },
  9: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && s.network.networkAcls.some((acl) => !acl.isDefault && acl.entries.length > 0)); } },
  10: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && noPublicSsh(s) && s.network.flowLogs.length > 0); } },
  11: { strategy: "cli", stateCheck: (raw) => awsState(raw)?.compute.instances.some((instance) => instance.instanceId === "i-00000001" && instance.metadataOptions.httpTokens === "required") ?? false },
  12: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && noPublicSsh(s)); } },
  13: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s?.compute.instances.some((instance) => instance.patchState.missingCount > 0 && instance.patchState.cves.length > 0)); } },
  14: { strategy: "cli", stateCheck: (raw) => awsState(raw)?.compute.instances.some((instance) => instance.instanceId === "i-00000001" && instance.metadataOptions.httpTokens === "required") ?? false },
  15: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && s.s3.buckets.some((bucket) => bucket.objects.length > 0)); } },
  16: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && fullyBlockedPublicS3(s)); } },
  17: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && s.s3.buckets.every((bucket) => bucket.encryption !== null && bucket.versioning === "Enabled")); } },
  18: { strategy: "cli", stateCheck: (raw) => { const s = awsState(raw); return Boolean(s && s.compute.snapshots.length > 0 && s.compute.snapshots.every((snapshot) => !snapshot.public)); } },
  19: { strategy: "cli", stateCheck: (raw) => { const s = azureState(raw); const user = s?.identities.users.find((entry) => entry.userPrincipalName === "analyst@cyberlab.local"); const group = s?.identities.groups.find((entry) => entry.displayName === "Security Learners"); return Boolean(user?.accountEnabled && group?.members.includes(user.id)); } },
  20: { strategy: "cli", stateCheck: (raw) => { const s = azureState(raw); const user = s?.identities.users.find((entry) => entry.userPrincipalName === "analyst@cyberlab.local"); return Boolean(user && s?.rbac.assignments.some((entry) => entry.principalId === user.id && entry.role === "Reader" && entry.scope.endsWith("/resourceGroups/cyberlab-rg"))); } },
  21: { strategy: "cli", stateCheck: (raw) => { const s = azureState(raw); if (!s) return false; const publicSsh = s.resources.nsgs.some((nsg) => nsg.rules.some((rule) => rule.direction === "Inbound" && rule.access === "Allow" && (rule.source === "*" || rule.source === "0.0.0.0/0") && (rule.destinationPort === "22" || rule.destinationPort === "*"))); return !publicSsh && hardenedAzureStorage(s); } },
  22: { strategy: "cli", stateCheck: (raw) => azureState(raw)?.resources.vms.some((vm) => vm.name === "web-vm" && vm.powerState === "VM running" && vm.monitoringEnabled && vm.patchStatus.missingCritical === 0 && vm.patchStatus.missingSecurity === 0) ?? false },
  23: { strategy: "security", stateCheck: (raw) => { const s = securityState(raw); return Boolean(s && s.sentinel.alerts.length > 0 && s.sentinel.incidents.length > 0); } },
  24: { strategy: "security", stateCheck: (raw) => securityState(raw)?.sentinel.incidents.some((incident) => incident.notes.length > 0) ?? false },
  25: { strategy: "security" },
  26: { strategy: "security" },
  27: { strategy: "security", stateCheck: (raw) => securityState(raw)?.defender.incidents.some((incident) => incident.notes.length > 0) ?? false },
  28: { strategy: "security" },
  29: { strategy: "security" },
  30: { strategy: "security", stateCheck: (raw) => securityState(raw)?.defender.incidents.some((incident) => incident.notes.length > 0) ?? false },
};

export function validateLabEvidence(evidence: ValidationEvidence): PublicValidationCheck[] {
  const profile = LAB_VALIDATOR_REGISTRY[evidence.labNumber];
  if (!profile) return [{ label: "Published lab validator is available", passed: false }];

  const checks: PublicValidationCheck[] = [
    { label: "All lab tasks are recorded", passed: evidence.taskCount > 0 && evidence.lastTaskPosition >= evidence.taskCount },
  ];

  if (profile.strategy === "cli") {
    checks.push({ label: "Required simulator evidence is present", passed: hasAllCliEvidence(evidence) });
  } else if (profile.strategy === "security") {
    checks.push({ label: "Required investigation queries are present", passed: hasAllQueryEvidence(evidence) });
  }

  if (mutationRequired(evidence)) {
    checks.push({ label: "Required persisted lab action is present", passed: stateRevision(evidence.environmentState) > stateRevision(evidence.initialState) });
  }
  if (profile.stateCheck) checks.push({ label: "Final persisted state satisfies the lab objective", passed: profile.stateCheck(evidence.environmentState) });

  return checks;
}
