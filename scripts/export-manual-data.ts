import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { LABS } from "@/lib/labs/catalog";
import { LAB_EDUCATIONAL_CONTENT } from "@/lib/labs/content";

const contentByNumber = new Map(LAB_EDUCATIONAL_CONTENT.map((entry) => [entry.number, entry]));
const labs = LABS.map((lab) => {
  const content = contentByNumber.get(lab.number);
  if (!content) throw new Error(`Missing curriculum for lab ${lab.number}.`);
  return { ...lab, ...content };
});

if (labs.length !== 30) throw new Error(`Expected 30 labs, received ${labs.length}.`);
for (const lab of labs) {
  if (lab.tasks.length !== 4) throw new Error(`Lab ${lab.number} must have 4 tasks.`);
  if (lab.hints.length !== 3) throw new Error(`Lab ${lab.number} must have 3 hints.`);
  if (!lab.solution.commands.length) throw new Error(`Lab ${lab.number} has no solution commands.`);
}

const output = resolve(process.cwd(), process.argv[2] ?? "lab-manual-data.json");
writeFileSync(output, JSON.stringify({
  product: "CyberLab Studio Pro",
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  labs,
}, null, 2));
console.log(`Exported ${labs.length} labs to ${output}`);
