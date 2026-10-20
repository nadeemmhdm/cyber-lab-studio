import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const required = [
  "README.md",
  "SECURITY.md",
  "docs/GETTING-STARTED.md",
  "docs/DEPLOYMENT.md",
  "docs/BACKUP-RESTORE.md",
  "docs/UNIFIED-SETUP.md",
  "docs/RELEASE-CHECKLIST.md",
  "docs/CURRICULUM.md",
  "docs/VALIDATION-AND-ACHIEVEMENTS.md",
  "docs/MANAGEMENT.md",
  "docs/PLATFORM-HARDENING.md",
  "docs/artifacts/CyberLab-Studio-Pro-v1.0.0.pptx",
  "docs/artifacts/CyberLab-Studio-Pro-Lab-Manual-v1.0.0.docx",
  "install.ps1",
  "install.sh",
  "cyberlab.cmd",
  "cyberlab.ps1",
  "cyberlab.sh",
  "scripts/cyberlab.mjs",
  "scripts/remote-setup.mjs",
  "scripts/provision-first-admin.ts",
  "scripts/windows-setup.ps1",
  "scripts/windows-start.ps1",
  "scripts/backup-sqlite.mjs",
  "scripts/restore-sqlite.mjs",
  "deploy/cloudflared/config.example.yml",
  "tests/e2e/two-user-isolation.test.ts",
];

const missing = required.filter((path) => !existsSync(resolve(process.cwd(), path)));
const phaseNamedDocs = readdirSync(resolve(process.cwd(), "docs")).filter((name) => /^PHASE\d/i.test(name));
const forbidden = ["docs/BRANCH-PROTECTION.md"].filter((path) => existsSync(resolve(process.cwd(), path)));
if (missing.length || phaseNamedDocs.length || forbidden.length) {
  if (missing.length) console.error(`Missing release files:\n- ${missing.join("\n- ")}`);
  if (phaseNamedDocs.length) console.error(`Phase-numbered documentation must be renamed:\n- ${phaseNamedDocs.join("\n- ")}`);
  if (forbidden.length) console.error(`Obsolete repository-admin docs must be removed:\n- ${forbidden.join("\n- ")}`);
  process.exit(1);
}
console.log(`Release repository check passed (${required.length} required files, remote installer present, no obsolete phase/ruleset docs).`);
