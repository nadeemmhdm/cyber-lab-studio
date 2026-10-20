import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8"); }
function write(path, content) { writeFileSync(path, content.replace(/\r\n/g, "\n"), "utf8"); }
function replaceOrFail(path, pattern, replacement, label) {
  const before = read(path);
  const after = before.replace(pattern, replacement);
  if (after === before) {
  if (typeof replacement === "string" && before.includes(replacement)) return;
  throw new Error(`Could not apply ${label} to ${path}`);
}
  write(path, after);
}

// Release identity.
for (const path of ["package.json", "package-lock.json"]) {
  const value = JSON.parse(read(path));
  value.version = "1.0.0";
  if (value.packages?.[""]) value.packages[""].version = "1.0.0";
  write(path, JSON.stringify(value, null, 2) + "\n");
}

// First-run environment configuration.
replaceOrFail(
  ".env.example",
  /# Set this only for the first administrator bootstrap\.[\s\S]*?INITIAL_ADMIN_EMAIL=""/,
  `# First-run administrator provisioning. Set a random one-time token of at least\n# 32 characters. Optionally restrict the first administrator to one email address.\n# Remove INITIAL_ADMIN_SETUP_TOKEN after the first administrator is created and restart.\nINITIAL_ADMIN_SETUP_TOKEN=""\nINITIAL_ADMIN_EMAIL=""`,
  "first-admin environment settings",
);

// Windows setup guidance.
replaceOrFail(
  "scripts/windows-setup.ps1",
  /Write-Host "Fill Firebase Web\/Admin values, SESSION_SECRET, and INITIAL_ADMIN_EMAIL before signing in\." -ForegroundColor Yellow/,
  `Write-Host "Fill Firebase Web/Admin values and SESSION_SECRET, then set a random INITIAL_ADMIN_SETUP_TOKEN (32+ characters)." -ForegroundColor Yellow`,
  "Windows env guidance",
);
replaceOrFail(
  "scripts/windows-setup.ps1",
  /Write-Host "2\. Start with: npm run dev"[\s\S]*?Write-Host "5\. Confirm \/admin access, remove INITIAL_ADMIN_EMAIL from \.env, then restart CyberLab\."/,
  `Write-Host "2. Start with: npm run dev"\nWrite-Host "3. Open http://localhost:3000/setup and provision the first administrator with the setup token."\nWrite-Host "4. Confirm /admin access."\nWrite-Host "5. Remove INITIAL_ADMIN_SETUP_TOKEN from .env and restart CyberLab."\nWrite-Host "6. Administrators provision instructors; instructors create seat-limited enrollment links for students."`,
  "Windows first-admin instructions",
);

// README account model and first admin flow.
replaceOrFail(
  "README.md",
  /- Firebase Authentication with email\/password, verification links, password-reset links, Google sign-in, and Firebase Admin HttpOnly server sessions\./,
  `- Firebase Authentication with email/password, verification links, password-reset links, Google sign-in, Firebase TOTP two-factor authentication, persistent sign-in cooldowns, and Firebase Admin HttpOnly server sessions.`,
  "README auth feature line",
);
replaceOrFail(
  "README.md",
  /- Instructor learner assignments and seat\/time-limited enrollment links\./,
  `- Instructor learner assignments and seat/time-limited enrollment links; public student self-signup is disabled.\n- Per-lab **Ask a Doubt** conversations with protected screenshot capture/upload and continuous student-instructor chat.`,
  "README enrollment and doubt features",
);
replaceOrFail(
  "README.md",
  /### 4\. Create the first administrator[\s\S]*?### 5\. Run/,
  `### 4. Create the first administrator\n\nGenerate a strong one-time setup token and place it in \`.env\`:\n\n\`\`\`env\nINITIAL_ADMIN_SETUP_TOKEN="replace-with-at-least-32-random-characters"\nINITIAL_ADMIN_EMAIL="admin@example.com"\n\`\`\`\n\n\`INITIAL_ADMIN_EMAIL\` is optional; when set, the first administrator must use that address. Then:\n\n1. Start CyberLab with \`npm run dev\`.\n2. Open \`http://localhost:3000/setup\`.\n3. Enter the setup token, administrator display name, email, and a strong password.\n4. Confirm \`/admin\` opens.\n5. Remove \`INITIAL_ADMIN_SETUP_TOKEN\` from \`.env\` and restart CyberLab.\n\nThe first-run endpoint becomes permanently unavailable after an Administrator exists. Administrators provision Instructor accounts; Instructors generate seat-limited, expiring enrollment links so students can choose their own username/password. There is no public student self-signup.\n\n### 5. Run`,
  "README first-admin flow",
);
replaceOrFail(
  "README.md",
  /Signed-in users can open `\/support` to report lab, account, access, content, or platform issues\.[\s\S]*?The Admin control center also manages users\/roles\/suspension, learning-mode policy, hints\/solutions, lab availability, platform maintenance\/quotas, audit history, database health, and performance telemetry\./,
  `Signed-in users can open \`/support\` to report lab, account, access, content, or platform issues. Users see only their own support conversations.\n\nInside each lab workspace, a student can open **Ask a Doubt**, capture a selected screen/window or upload a PNG/JPEG/WebP screenshot under 2 MB, and continue a private conversation with the assigned instructor. Screenshots are served only through authenticated, authorized routes.\n\nAdministrators can see the reporter account, roles, account status, conversation history, category/priority, reply directly, and move support tickets through \`OPEN\`, \`IN_PROGRESS\`, \`RESOLVED\`, and \`CLOSED\`.\n\nThe Admin control center also manages student/instructor/admin accounts, roles, suspension, password reset, instructor provisioning, learning-mode policy, hints/solutions, lab availability, platform maintenance/quotas, audit history, database health, and performance telemetry.`,
  "README support and account management",
);
replaceOrFail(
  "README.md",
  /- \[`MANAGEMENT\.md`\]\(docs\/MANAGEMENT\.md\) — instructor, admin, enrollment, and support management\./,
  `- [\`ACCOUNT-ONBOARDING.md\`](docs/ACCOUNT-ONBOARDING.md) — first admin, instructor provisioning, enrollment links, username login, cooldowns, and TOTP MFA.\n- [\`MANAGEMENT.md\`](docs/MANAGEMENT.md) — instructor, admin, enrollment, and support management.`,
  "README account documentation link",
);

// Getting started: current account lifecycle, no public signup.
replaceOrFail(
  "docs/GETTING-STARTED.md",
  /## First administrator account[\s\S]*?## Start locally/,
  `## First administrator account\n\nSet a one-time setup token in \`.env\` before the first administrator is created:\n\n\`\`\`env\nINITIAL_ADMIN_SETUP_TOKEN="replace-with-at-least-32-random-characters"\nINITIAL_ADMIN_EMAIL="admin@example.com"\n\`\`\`\n\nThe email restriction is optional. Then:\n\n1. Start CyberLab with \`npm run dev\`.\n2. Open \`http://localhost:3000/setup\`.\n3. Enter the setup token, administrator display name, email, and strong password.\n4. Confirm \`/admin\` opens.\n5. Remove \`INITIAL_ADMIN_SETUP_TOKEN\` from \`.env\` and restart the application.\n\nThe setup route refuses another first-admin provisioning after an Administrator exists. Public student self-registration is disabled. Administrators create Instructor accounts; an Instructor chooses a seat count and expiry to generate one enrollment link. Each student opens that link and chooses their own username/password until the seat limit is consumed.\n\n## Start locally`,
  "getting-started first-admin flow",
);
replaceOrFail(
  "docs/GETTING-STARTED.md",
  /- \*\*Student\*\* — starts labs, keeps isolated progress\/history, earns flags\/achievements, and submits support reports\./,
  `- **Student** — joins through an Instructor enrollment link, uses username/password sign-in, starts labs, keeps isolated progress/history, earns flags/achievements, opens per-lab doubts, and submits support reports.`,
  "getting-started student role",
);

// Deployment references current bootstrap/onboarding.
replaceOrFail(
  "docs/DEPLOYMENT.md",
  /Complete `GETTING-STARTED\.md`, remove `INITIAL_ADMIN_EMAIL` after the first administrator is created, then run:/,
  `Complete \`GETTING-STARTED.md\`, provision the first administrator through \`/setup\`, remove \`INITIAL_ADMIN_SETUP_TOKEN\` after successful provisioning, then run:`,
  "deployment bootstrap wording",
);
replaceOrFail(
  "docs/DEPLOYMENT.md",
  /2\. Register\/login and verify the Firebase email flow\./,
  `2. Sign in with the provisioned administrator, or create an Instructor enrollment link and verify a student can claim one seat with a username/password.`,
  "deployment public verification",
);

// Learner-facing terminology.
replaceOrFail(
  "app/labs/[slug]/workspace/page.tsx",
  /<p className="eyebrow">Native simulator<\/p><h2 className="mt-1 text-xl font-semibold">AWS CLI<\/h2>/,
  `<p className="eyebrow">AWS-compatible environment</p><h2 className="mt-1 text-xl font-semibold">AWS CLI</h2>`,
  "AWS workspace wording",
);
replaceOrFail(
  "app/labs/[slug]/workspace/page.tsx",
  /<p className="eyebrow">Native simulator<\/p><h2 className="mt-1 text-xl font-semibold">Azure CLI<\/h2>/,
  `<p className="eyebrow">Azure-compatible environment</p><h2 className="mt-1 text-xl font-semibold">Azure CLI</h2>`,
  "Azure workspace wording",
);
replaceOrFail(
  "app/labs/[slug]/workspace/page.tsx",
  /Persisted simulator state/g,
  "Persisted environment state",
  "workspace state wording",
);

// Roadmap reflects final release state and current Firebase onboarding model.
replaceOrFail(
  "docs/ROADMAP.md",
  /- \[x\] Firebase email\/password signup and login/,
  `- [x] Firebase email/password identity and login`,
  "roadmap auth wording",
);
replaceOrFail(
  "docs/ROADMAP.md",
  /## Phase 12 — Full testing and deployment[\s\S]*$/,
  `## Phase 12 — Full testing and deployment\n- [x] Unit/integration/E2E suite\n- [x] Two-user isolation E2E\n- [x] Windows install documentation\n- [x] Backup/restore tooling\n- [x] Cloudflare Tunnel setup\n- [x] Cloudflare Access recommendation for admin routes\n- [x] Final compatibility matrices\n- [x] Release checklist\n`,
  "Phase 12 roadmap completion",
);

// Release checklist matches admin-controlled onboarding and MFA/doubt features.
replaceOrFail(
  "docs/RELEASE-CHECKLIST.md",
  /- \[ \] Email\/password registration, verification, login, reset, logout and logout-all work\./,
  `- [ ] Admin-controlled Email/Password onboarding, login, password reset/admin reset, logout and logout-all work.`,
  "release checklist onboarding",
);
replaceOrFail(
  "docs/RELEASE-CHECKLIST.md",
  /- \[ \] First administrator bootstrap works only for the configured verified email and cannot be repeated\./,
  `- [ ] First administrator setup requires the one-time setup token, honors the optional email restriction, and cannot be repeated.\n- [ ] Instructor seat-limited enrollment links create assigned Student accounts with learner-chosen usernames/passwords.\n- [ ] TOTP MFA enrollment/sign-in works and persistent login cooldown activates after repeated password failures.`,
  "release checklist first admin/MFA",
);
replaceOrFail(
  "docs/RELEASE-CHECKLIST.md",
  /- \[ \] Support report\/reply\/status workflow works for learner and administrator views\./,
  `- [ ] Support report/reply/status workflow works for learner and administrator views.\n- [ ] Per-lab Ask a Doubt screenshot/chat works between a Student and assigned Instructor.`,
  "release checklist doubt flow",
);
replaceOrFail(
  "docs/RELEASE-CHECKLIST.md",
  /- \[ \] `INITIAL_ADMIN_EMAIL` is removed after the first administrator is created\./,
  `- [ ] \`INITIAL_ADMIN_SETUP_TOKEN\` is removed after the first administrator is created; any optional email restriction is reviewed.`,
  "release checklist setup-token cleanup",
);

// Account/onboarding operator guide.
write("docs/ACCOUNT-ONBOARDING.md", `# Account and Classroom Onboarding\n\nCyberLab Studio Pro v1.0.0 uses administrator-controlled account provisioning. Public student self-signup is disabled.\n\n## First administrator\n\nSet a random \`INITIAL_ADMIN_SETUP_TOKEN\` of at least 32 characters and optionally \`INITIAL_ADMIN_EMAIL\`. Start the application and open \`/setup\`. The setup form creates the Firebase Authentication identity and local Administrator role together. After success, remove the setup token and restart. The route refuses another first-admin provisioning once an Administrator exists.\n\n## Instructors\n\nAdministrators create Instructor accounts from the Admin control center. Administrators can manage roles, suspension, and password reset for Student, Instructor, and Administrator accounts. Password reset revokes active Firebase refresh tokens.\n\n## Student enrollment links\n\nAn Instructor selects a seat count and expiry and generates one enrollment link. Raw invite tokens are not stored in SQLite; only a digest is retained. Each Student opens the link and chooses a unique username and password. Seat consumption and instructor assignment are transactional, so the link cannot create more accounts than its configured capacity.\n\nStudent username sign-in uses the username field shown in the UI. The internal Firebase address used to back username accounts is an implementation detail and is not presented as the learner identity.\n\n## Sign-in cooldown\n\nCyberLab tracks repeated password failures against the submitted identifier and network source. Cooldown increases after repeated failures, while Firebase abuse protection remains an additional control. A successful sign-in clears the CyberLab failure counter.\n\n## TOTP two-factor authentication\n\nUsers can enroll Firebase TOTP MFA from Profile. The QR code is rendered locally in the browser/application path; the TOTP secret is not sent to a third-party QR service. When Firebase requires MFA during sign-in, CyberLab resolves the real TOTP second-factor challenge before creating the HttpOnly server session.\n\n## Classroom support\n\nStudents can use **Ask a Doubt** from a lab workspace. A selected screen/window can be captured through the browser or a PNG/JPEG/WebP screenshot under 2 MB can be uploaded. The thread and screenshot are authorized to the Student, assigned Instructor, and Administrators only. Instructor and Student can continue the conversation until the thread is closed.\n\nGeneric platform/account reports remain available through \`/support\`, with private reporter conversations and Administrator replies.\n`);

// Final platform compatibility section.
let compatibility = read("docs/COMPATIBILITY.md");
if (!compatibility.includes("## Release platform compatibility")) {
  compatibility += `\n\n## Release platform compatibility\n\n| Surface | v1.0.0 status |\n| --- | --- |\n| Windows 10/11 + Node.js 24.12+ | Release setup/start scripts and Windows CI gate |\n| Ubuntu GitHub Actions | Full dependency/schema/lint/type/test/E2E/build gate |\n| SQLite + Prisma | Primary application state, clean-schema/seed/backup/restore workflow |\n| Firebase Email/Password + Google | Supported identity providers through Firebase configuration |\n| Firebase TOTP MFA | Supported enrollment and sign-in resolver flow |\n| Cloudflare Tunnel | Supported public HTTPS path for the web origin only |\n| Cloudflare Access | Recommended additional perimeter layer for privileged routes |\n| Public student self-signup | Disabled; Instructor enrollment links are the supported classroom onboarding path |\n\nThe default v1.0.0 release does not forward learner cloud-style commands to a host shell and does not contact production AWS or Azure accounts.\n`;
  write("docs/COMPATIBILITY.md", compatibility);
}

// Remove obsolete naming now covered by AZURE-ENVIRONMENT.md.
if (existsSync("docs/AZURE-SIMULATOR.md")) unlinkSync("docs/AZURE-SIMULATOR.md");

// Final CI: Linux full gate plus Windows release gate.
write(".github/workflows/ci.yml", `name: CI\n\non:\n  push:\n    branches: [main, phase-12-release]\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  validate-linux:\n    runs-on: ubuntu-latest\n    timeout-minutes: 30\n    env:\n      DATABASE_URL: file:./ci.db\n      APP_URL: http://localhost:3000\n      SESSION_SECRET: ci-session-secret-with-at-least-32-characters\n      NEXT_PUBLIC_FIREBASE_API_KEY: ci-api-key\n      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ci.firebaseapp.com\n      NEXT_PUBLIC_FIREBASE_PROJECT_ID: ci-project\n      NEXT_PUBLIC_FIREBASE_APP_ID: 1:123:web:ci\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24.12.0\n          cache: npm\n      - name: Install locked dependencies\n        run: npm ci\n      - name: Dependency audit\n        run: npm audit --audit-level=moderate\n      - name: Generate Prisma client\n        run: npm run db:generate\n      - name: Validate Prisma schema\n        run: npx prisma validate\n      - name: Create SQLite schema\n        run: npx prisma db push --skip-generate\n      - name: Seed database\n        run: npm run db:seed\n      - name: Validate curriculum export\n        run: npx tsx scripts/export-manual-data.ts lab-manual-data.json\n      - name: Lint\n        run: npm run lint\n      - name: Typecheck\n        run: npm run typecheck\n      - name: Unit and integration tests\n        run: npm run test\n      - name: Two-user release E2E\n        run: npm run test:e2e\n      - name: Release structure check\n        run: npm run release:check\n      - name: Production build\n        run: npm run build\n\n  validate-windows:\n    runs-on: windows-latest\n    timeout-minutes: 35\n    env:\n      DATABASE_URL: file:./ci-windows.db\n      APP_URL: http://localhost:3000\n      SESSION_SECRET: ci-session-secret-with-at-least-32-characters\n      NEXT_PUBLIC_FIREBASE_API_KEY: ci-api-key\n      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ci.firebaseapp.com\n      NEXT_PUBLIC_FIREBASE_PROJECT_ID: ci-project\n      NEXT_PUBLIC_FIREBASE_APP_ID: 1:123:web:ci\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24.12.0\n          cache: npm\n      - name: Install locked dependencies\n        run: npm ci\n      - name: Generate Prisma client\n        run: npm run db:generate\n      - name: Validate Prisma schema\n        run: npx prisma validate\n      - name: Create SQLite schema\n        run: npx prisma db push --skip-generate\n      - name: Seed database\n        run: npm run db:seed\n      - name: Unit and integration tests\n        run: npm run test\n      - name: Two-user release E2E\n        run: npm run test:e2e\n      - name: Release structure check\n        run: npm run release:check\n      - name: Production build\n        run: npm run build\n`);

console.log("Repository release finalization applied.");
