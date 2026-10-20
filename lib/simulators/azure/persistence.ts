import { Prisma } from "@prisma/client";
import { LabEngineError, mutateEnvironment } from "@/lib/labs/engine";
import { prisma } from "@/lib/prisma";
import { AzureSimulatorError, executeAzureCommand } from "@/lib/simulators/azure/engine";
import type { AzureCliResult, AzureSimulatorState } from "@/lib/simulators/azure/types";

function outputSummary(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 1200 ? `${text.slice(0, 1197)}...` : text;
}

export async function executePersistedAzureCommand(userId: string, environmentId: string, command: string): Promise<AzureCliResult> {
  const owned = await prisma.labEnvironment.findFirst({ where: { id: environmentId, userId }, select: { id: true } });
  if (!owned) throw new LabEngineError("ENVIRONMENT_FORBIDDEN", "Environment not found for this user.", 404);

  try {
    const execution = await mutateEnvironment(userId, environmentId, (raw) => {
      const state = raw as unknown as AzureSimulatorState;
      if (state.kind !== "azure") throw new AzureSimulatorError("InvalidArgument", "This environment is not an Azure simulator state.", "environment");
      const result = executeAzureCommand(state, command);
      return {
        state: state as unknown as Prisma.InputJsonObject,
        resourceInventory: state.resourceInventory as unknown as Prisma.InputJsonValue,
        result,
      };
    });
    await prisma.terminalHistory.create({ data: { userId, environmentId, command, exitCode: 0, outputSummary: outputSummary(execution.result.output) } });
    return { exitCode: 0, output: execution.result.output };
  } catch (error) {
    if (error instanceof AzureSimulatorError) {
      const message = error.cliMessage();
      await prisma.terminalHistory.create({ data: { userId, environmentId, command, exitCode: 1, outputSummary: message } });
      return { exitCode: 1, output: message, error: { code: error.code, message: error.message } };
    }
    throw error;
  }
}
