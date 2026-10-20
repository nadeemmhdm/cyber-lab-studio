import { Prisma } from "@prisma/client";
import { KqlError, executeKql } from "@/lib/kql/engine";
import { LabEngineError, mutateEnvironment } from "@/lib/labs/engine";
import { prisma } from "@/lib/prisma";
import { runSentinelAnalytics, SecuritySimulatorError, updateDefenderIncident, updateSentinelIncident } from "@/lib/simulators/security/engine";
import type { IncidentStatus, SecuritySeverity, SecuritySimulatorState } from "@/lib/simulators/security/types";

async function requireOwnedSecurityEnvironment(userId: string, environmentId: string) {
  const environment = await prisma.labEnvironment.findFirst({ where: { id: environmentId, userId }, select: { id: true, environmentState: true } });
  if (!environment) throw new LabEngineError("ENVIRONMENT_FORBIDDEN", "Environment not found for this user.", 404);
  const state = environment.environmentState as unknown as SecuritySimulatorState;
  if (state.kind !== "security") throw new SecuritySimulatorError("InvalidState", "This environment is not a Sentinel/KQL/Defender security state.");
  return state;
}

export async function executePersistedKqlQuery(userId: string, environmentId: string, query: string) {
  const state = await requireOwnedSecurityEnvironment(userId, environmentId);
  try {
    const result = executeKql(state.datasets, query);
    await prisma.queryHistory.create({ data: { userId, environmentId, query, rowCount: result.rowCount, executionMs: Math.ceil(result.executionMs), errorCode: null } });
    return result;
  } catch (error) {
    const code = error instanceof KqlError ? error.code : "ExecutionError";
    await prisma.queryHistory.create({ data: { userId, environmentId, query, rowCount: 0, executionMs: 0, errorCode: code } });
    throw error;
  }
}

export async function runPersistedSentinelAnalytics(userId: string, environmentId: string, ruleId?: string) {
  return mutateEnvironment(userId, environmentId, (raw) => {
    const state = raw as unknown as SecuritySimulatorState;
    if (state.kind !== "security" || state.platform !== "SENTINEL") throw new SecuritySimulatorError("InvalidState", "Sentinel analytics can run only in a Sentinel lab environment.");
    const created = runSentinelAnalytics(state, ruleId);
    return { state: state as unknown as Prisma.InputJsonObject, resourceInventory: state.resourceInventory as unknown as Prisma.InputJsonValue, result: { created, incidents: state.sentinel.incidents } };
  });
}

type IncidentUpdate = { status?: IncidentStatus; severity?: SecuritySeverity; note?: string; author?: string };

export async function updatePersistedSentinelIncident(userId: string, environmentId: string, incidentId: string, input: IncidentUpdate) {
  return mutateEnvironment(userId, environmentId, (raw) => {
    const state = raw as unknown as SecuritySimulatorState;
    if (state.kind !== "security" || state.platform !== "SENTINEL") throw new SecuritySimulatorError("InvalidState", "This is not a Sentinel lab environment.");
    const incident = updateSentinelIncident(state, incidentId, input);
    return { state: state as unknown as Prisma.InputJsonObject, resourceInventory: state.resourceInventory as unknown as Prisma.InputJsonValue, result: incident };
  });
}

export async function updatePersistedDefenderIncident(userId: string, environmentId: string, incidentId: string, input: IncidentUpdate) {
  return mutateEnvironment(userId, environmentId, (raw) => {
    const state = raw as unknown as SecuritySimulatorState;
    if (state.kind !== "security" || state.platform !== "DEFENDER_XDR") throw new SecuritySimulatorError("InvalidState", "This is not a Defender XDR lab environment.");
    const incident = updateDefenderIncident(state, incidentId, input);
    return { state: state as unknown as Prisma.InputJsonObject, resourceInventory: state.resourceInventory as unknown as Prisma.InputJsonValue, result: incident };
  });
}
