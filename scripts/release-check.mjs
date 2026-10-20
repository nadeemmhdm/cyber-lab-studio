import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const required = [
  "README.md",
  "SECURITY.md",
  "docs/GETTING-STARTED.md",
  "docs/DEPLOYMENT.md",
  "docs/BACKUP-RESTORE.md",
  "docs/BRANCH-PROTECTION.md",
  "docs/RELEASE-CHECKLIST.md",
  "docs/CURRICULUM.md",
  "docs/VALIDATION-AND-ACHIEVEMENTS.md",
  "docs/MANAGEMENT.md",
  "docs/PLATFORM-HARDENING.md",
  "docs/artifacts/CyberLab-Studio-Pro-v1.0.0.pptx",
  "docs/artifacts/CyberLab-Studio-Pro-Lab-Manual-v1.0.0.docx",
  "scripts/windows-setup.ps1",
  "scripts/windows-start.ps1",
  "scripts/backup-sqlite.mjs",
  "scripts/restore-sqlite.mjs",
  "deploy/cloudflared/config.example.yml",
  "tests/e2e/two-user-isolation.test.ts",
];

const missing = required.filter((path) => !existsSync(resolve(process.cwd(), path)));
const phaseNamedDocs = readdirSync(resolve(process.cwd(), "docs")).filter((name) => /^PHASE\d/i.test(name));
if (missing.length || phaseNamedDocs.length) {
  if (missing.length) console.error(`Missing release files:\n- ${missing.join("\n- ")}`);
  if (phaseNamedDocs.length) console.error(`Phase-numbered documentation must be renamed:\n- ${phaseNamedDocs.join("\n- ")}`);
  process.exit(1);
}
console.log(`Release repository check passed (${required.length} required files, no PHASE*.md documents).`);
