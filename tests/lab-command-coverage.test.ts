import { describe, expect, it } from "vitest";
import { executeKql } from "@/lib/kql/engine";
import { LAB_EDUCATIONAL_CONTENT } from "@/lib/labs/content";
import { executeAwsCommand } from "@/lib/simulators/aws/engine";
import { createInitialAwsState } from "@/lib/simulators/aws/initial-state";
import { createInitialAzureState, executeAzureCommand } from "@/lib/simulators/azure/engine";
import { createSyntheticSecurityDatasets } from "@/lib/simulators/security/engine";

function executableCommands(number: number) {
  const content = LAB_EDUCATIONAL_CONTENT.find((entry) => entry.number === number);
  if (!content) throw new Error(`Missing lab ${number}`);
  return content.solution.commands.map((step) => step.command.trim()).filter((command) => command && !command.startsWith("UI →"));
}

describe("30-lab command compatibility", () => {
  it("keeps every AWS solution command executable in its lab state", () => {
    for (let number = 3; number <= 18; number += 1) {
      const state = createInitialAwsState(number);
      const commands = executableCommands(number);
      expect(commands.length, `Lab ${number} should contain executable AWS commands`).toBeGreaterThan(0);
      for (const command of commands) {
        expect(command.startsWith("aws "), `Lab ${number}: unexpected non-AWS command: ${command}`).toBe(true);
        expect(() => executeAwsCommand(state, command), `Lab ${number}: ${command}`).not.toThrow();
      }
    }
  });

  it("keeps every Azure solution command executable in its lab state", () => {
    for (let number = 19; number <= 22; number += 1) {
      const state = createInitialAzureState(number);
      const commands = executableCommands(number);
      expect(commands.length, `Lab ${number} should contain executable Azure commands`).toBeGreaterThan(0);
      for (const command of commands) {
        expect(command.startsWith("az "), `Lab ${number}: unexpected non-Azure command: ${command}`).toBe(true);
        expect(() => executeAzureCommand(state, command), `Lab ${number}: ${command}`).not.toThrow();
      }
    }
  });

  it("keeps every security-lab solution query executable", () => {
    const tables = createSyntheticSecurityDatasets();
    for (let number = 23; number <= 30; number += 1) {
      const commands = executableCommands(number);
      expect(commands.length, `Lab ${number} should contain executable KQL queries`).toBeGreaterThan(0);
      for (const query of commands) {
        const result = executeKql(tables, query);
        expect(Array.isArray(result.rows), `Lab ${number}: ${query}`).toBe(true);
      }
    }
  });

  it("keeps fundamentals labs UI-driven rather than pretending to execute shell commands", () => {
    for (const number of [1, 2]) {
      const content = LAB_EDUCATIONAL_CONTENT.find((entry) => entry.number === number)!;
      for (const step of content.solution.commands) expect(step.command.startsWith("UI →")).toBe(true);
    }
  });
});
