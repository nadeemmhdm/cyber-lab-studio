# CyberLab Studio Pro v1.0.0 — Release Notes

CyberLab Studio Pro v1.0.0 is the first complete release of the multi-user cloud-security lab platform. The release contains 30 versioned labs across cloud-security fundamentals, AWS-compatible workflows, Azure-compatible workflows, KQL, Microsoft Sentinel, and Defender XDR.

## Release highlights

- 30 complete labs with concepts, scenarios, four-task workflows, three progressive hint levels, detailed solutions, expected evidence, verification, common mistakes, and troubleshooting.
- Firebase Authentication with email/password, Google sign-in, email verification/reset support where applicable, HttpOnly server sessions, persistent sign-in cooldowns, and real Firebase TOTP MFA.
- Administrator-controlled account lifecycle: secure first-admin provisioning, Admin-created Instructor accounts, and Instructor-generated seat-limited/expiring Student enrollment links with learner-chosen usernames/passwords.
- SQLite + Prisma persistence with isolated, versioned per-learner lab state.
- AWS-compatible identity, networking, compute, storage, audit, and security-posture workflows.
- Azure-compatible Entra ID, RBAC, networking, storage, VM, monitoring, audit, and security-posture workflows.
- KQL lexer/parser/AST/evaluator over persisted synthetic security datasets.
- Microsoft Sentinel detection/alert/incident workflows and Defender XDR investigation/correlation workflows over shared stored events.
- Server-side validation for all 30 labs, cryptographically unique flags, achievements, immutable verified completions, and audit evidence.
- Instructor progress/assignment management, Admin user/role/suspension/password/curriculum/platform controls, and private user support conversations.
- Per-lab **Ask a Doubt** with selected-screen capture or screenshot upload, protected image access, assigned-instructor replies, and continuous chat.
- Smooth responsive UI/UX with route transitions, micro-interactions, loading states, keyboard focus, and reduced-motion support.
- Windows-first setup/start scripts, SQLite backup/restore utilities, Cloudflare Tunnel deployment guidance, Cloudflare Access recommendations for privileged routes, and Linux + Windows release CI gates.

## Training environment boundary

Supported AWS/Azure-style commands and security investigation actions execute against isolated CyberLab state. Learner commands are not forwarded to the host shell, and the default release does not connect learner workflows to production AWS or Azure accounts.

## Release verification

The release gate requires locked dependency installation, npm security audit, Prisma schema creation/seed, curriculum export validation, lint, strict TypeScript, unit/integration tests, two-user isolation E2E, release-structure validation, and production build. The same release E2E/build path is also executed on Windows CI.

## Release artifacts

- `docs/artifacts/CyberLab-Studio-Pro-Lab-Manual-v1.0.0.docx` — complete 30-lab manual and solutions.
- `docs/artifacts/CyberLab-Studio-Pro-v1.0.0.pptx` — product, architecture, operations, and release presentation.

See `README.md`, `docs/GETTING-STARTED.md`, `docs/DEPLOYMENT.md`, `docs/ACCOUNT-ONBOARDING.md`, and `docs/RELEASE-CHECKLIST.md` for the operator workflow.
