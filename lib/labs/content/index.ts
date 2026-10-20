import { LABS } from "@/lib/labs/catalog";
import { AWS_CONTENT } from "@/lib/labs/content/aws";
import { AZURE_CONTENT } from "@/lib/labs/content/azure";
import { FUNDAMENTALS_CONTENT } from "@/lib/labs/content/fundamentals";
import { SECURITY_CONTENT } from "@/lib/labs/content/security";
import type { LabContentSeed, LabEducationalContent } from "@/lib/labs/content/types";

const SEEDS: readonly LabContentSeed[] = [
  ...FUNDAMENTALS_CONTENT,
  ...AWS_CONTENT,
  ...AZURE_CONTENT,
  ...SECURITY_CONTENT,
].sort((a, b) => a.number - b.number);

function buildContent(seed: LabContentSeed): LabEducationalContent {
  const lab = LABS.find((entry) => entry.number === seed.number);
  if (!lab) throw new Error(`Phase 8 content references unknown lab ${seed.number}.`);
  const id = String(seed.number).padStart(2, "0");
  const firstCommand = seed.commands[0]?.command ?? "the workspace evidence";

  return {
    number: seed.number,
    conceptExplanation: `${lab.title} focuses on ${seed.focus}. The goal is to connect configuration or telemetry to a security decision: establish a baseline, gather evidence, make only a supported change or investigation conclusion, and verify the result from persisted state. This lab never treats a button click, command exit code, or alert label as proof by itself; the learner must be able to explain why the evidence supports the conclusion.`,
    scenario: seed.scenario,
    prerequisites: seed.prerequisites ?? (seed.number > 1 ? [`Recommended: complete Lab ${String(seed.number - 1).padStart(2, "0")} first.`] : []),
    tasks: [
      {
        position: 1,
        title: "Establish the baseline",
        instruction: `${seed.investigate} Record the identifiers, fields, and control state you will use later for verification.`,
        validatorKey: `phase8.lab${id}.baseline`,
      },
      {
        position: 2,
        title: "Explain the security risk",
        instruction: `Before changing state, explain how the observed condition connects to this lab's objective and why it matters. Security consequence to consider: ${seed.consequence}`,
        validatorKey: `phase8.lab${id}.reason`,
      },
      {
        position: 3,
        title: "Perform the supported action",
        instruction: `${seed.action} Use only the documented simulator, KQL, or workspace operations for this lab; unsupported operations must not be treated as successful.`,
        validatorKey: `phase8.lab${id}.action`,
      },
      {
        position: 4,
        title: "Verify and summarize",
        instruction: `${seed.verify} Compare the final evidence with the baseline and state what changed, what did not change, and any residual risk.`,
        validatorKey: `phase8.lab${id}.verify`,
      },
    ],
    hints: [
      `Level 1 — Orientation: begin with the evidence source rather than guessing the answer. ${seed.investigate}`,
      `Level 2 — Direction: start with ${firstCommand}. Focus on the exact identity, resource, event, field, port, scope, or setting named in the scenario before you change anything.`,
      `Level 3 — Verification path: ${seed.action} Then prove the result independently: ${seed.verify}`,
    ],
    solution: {
      problem: seed.scenario,
      concept: `The central security concept is ${seed.focus}. A correct solution must show a traceable path from baseline evidence to the chosen action and then to independent verification.`,
      uiNavigation: `Open Lab ${id} workspace. Read Concept & scenario, complete the Tasks in order, use the platform terminal or KQL console where available, and use Persisted simulator state plus platform findings/incidents as verification evidence. Guided and Practice modes expose hints and the solution; Challenge mode intentionally hides them.`,
      commands: [...seed.commands],
      expectedOutput: seed.expected,
      whyItWorks: `${seed.action} This works because the CyberLab runtime evaluates the operation against the student's isolated persisted state or stored security rows, then subsequent read/query operations observe that same state instead of returning a canned success response.`,
      securityConsequence: seed.consequence,
      verification: seed.verify,
      commonMistakes: seed.mistakes,
      troubleshooting: seed.troubleshooting,
      summary: `Lab ${id} is complete educationally when the learner can explain the baseline, perform or justify the supported action, and verify the outcome for ${lab.objective.toLowerCase()} without relying on hidden validation details.`,
    },
  };
}

export const LAB_EDUCATIONAL_CONTENT: readonly LabEducationalContent[] = SEEDS.map(buildContent);

export function getLabEducationalContent(number: number) {
  const content = LAB_EDUCATIONAL_CONTENT.find((entry) => entry.number === number);
  if (!content) throw new Error(`Missing Phase 8 educational content for lab ${number}.`);
  return content;
}
