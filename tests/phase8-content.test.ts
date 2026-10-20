import { describe, expect, it } from "vitest";
import { executeKql } from "@/lib/kql/engine";
import { LABS } from "@/lib/labs/catalog";
import { LAB_EDUCATIONAL_CONTENT } from "@/lib/labs/content";
import { createSyntheticSecurityDatasets } from "@/lib/simulators/security/engine";

const forbiddenLeak = /CYBERLAB\{|validatorKey|secret flag|validation config/i;

describe("Phase 8 educational content", () => {
  it("covers every lab exactly once in catalogue order", () => {
    expect(LAB_EDUCATIONAL_CONTENT).toHaveLength(30);
    expect(LAB_EDUCATIONAL_CONTENT.map((entry) => entry.number)).toEqual(LABS.map((lab) => lab.number));
    expect(new Set(LAB_EDUCATIONAL_CONTENT.map((entry) => entry.number)).size).toBe(30);
  });

  it("provides substantial unique concepts and scenarios", () => {
    expect(new Set(LAB_EDUCATIONAL_CONTENT.map((entry) => entry.scenario)).size).toBe(30);
    expect(new Set(LAB_EDUCATIONAL_CONTENT.map((entry) => entry.conceptExplanation)).size).toBe(30);
    for (const content of LAB_EDUCATIONAL_CONTENT) {
      expect(content.conceptExplanation.length).toBeGreaterThan(280);
      expect(content.scenario.length).toBeGreaterThan(150);
      expect(content.prerequisites.length).toBeGreaterThan(0);
    }
  });

  it("provides four ordered tasks with unique validator keys for every lab", () => {
    const keys = new Set<string>();
    for (const content of LAB_EDUCATIONAL_CONTENT) {
      expect(content.tasks).toHaveLength(4);
      expect(content.tasks.map((task) => task.position)).toEqual([1, 2, 3, 4]);
      for (const task of content.tasks) {
        expect(task.title.length).toBeGreaterThan(5);
        expect(task.instruction.length).toBeGreaterThan(90);
        expect(keys.has(task.validatorKey)).toBe(false);
        keys.add(task.validatorKey);
      }
    }
    expect(keys.size).toBe(120);
  });

  it("provides exactly three progressive hints without hidden validation leakage", () => {
    for (const content of LAB_EDUCATIONAL_CONTENT) {
      expect(content.hints).toHaveLength(3);
      content.hints.forEach((hint, index) => {
        expect(hint).toContain(`Level ${index + 1}`);
        expect(hint.length).toBeGreaterThan(80);
        expect(hint).not.toMatch(forbiddenLeak);
      });
    }
  });

  it("provides a complete explained solution for every lab", () => {
    for (const content of LAB_EDUCATIONAL_CONTENT) {
      const solution = content.solution;
      expect(solution.problem.length).toBeGreaterThan(120);
      expect(solution.concept.length).toBeGreaterThan(140);
      expect(solution.uiNavigation.length).toBeGreaterThan(120);
      expect(solution.commands.length).toBeGreaterThan(1);
      expect(solution.expectedOutput.length).toBeGreaterThan(100);
      expect(solution.whyItWorks.length).toBeGreaterThan(170);
      expect(solution.securityConsequence.length).toBeGreaterThan(100);
      expect(solution.verification.length).toBeGreaterThan(80);
      expect(solution.commonMistakes.length).toBeGreaterThan(90);
      expect(solution.troubleshooting.length).toBeGreaterThan(100);
      expect(solution.summary.length).toBeGreaterThan(100);
      for (const step of solution.commands) {
        expect(step.command.length).toBeGreaterThan(5);
        expect(step.purpose.length).toBeGreaterThan(15);
        expect(step.explanation.length).toBeGreaterThan(60);
      }
      expect(JSON.stringify(solution)).not.toMatch(forbiddenLeak);
    }
  });

  it("keeps the security-lab KQL examples executable against the shared dataset", () => {
    const tables = createSyntheticSecurityDatasets();
    for (const content of LAB_EDUCATIONAL_CONTENT.filter((entry) => entry.number >= 23)) {
      for (const step of content.solution.commands) {
        if (step.command.startsWith("UI →")) continue;
        const result = executeKql(tables, step.command);
        expect(Array.isArray(result.rows)).toBe(true);
      }
    }
  });
});
