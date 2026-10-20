# CyberLab Studio Pro

[![CI](https://github.com/nadeemmhdm/cyber-lab-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/nadeemmhdm/cyber-lab-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/release-v1.0.0-2563eb)](#release)

**CyberLab Studio Pro** is a multi-user cloud-security training platform with 30 versioned labs across cloud fundamentals, AWS-compatible administration, Azure-compatible administration, KQL, Microsoft Sentinel workflows, and Defender XDR investigations.

The platform is designed for realistic hands-on workflow fidelity inside isolated learner environments: supported commands mutate persistent state, findings and history are derived from that state, unsupported operations fail explicitly, and final completion is verified by the server rather than by client-side buttons.

> **Environment boundary:** the default release keeps training state inside CyberLab. Learner AWS/Azure commands are parsed by internal engines, are never forwarded to the host shell, and do not contact a production AWS account or Azure subscription.

## Release

**CyberLab Studio Pro — Complete Lab Platform**  
**Version:** `v1.0.0`

All twelve implementation phases are complete in the release branch: architecture, authentication, product UI, isolated lab state, AWS, Azure, KQL/Sentinel/Defender, complete curriculum, validation/flags, instructor/admin management, platform hardening, and deployment/release verification.

## What ships

- 30 complete labs with concepts, scenarios, four-task workflows, three progressive hint levels, detailed solutions, expected evidence, verification, common mistakes, and troubleshooting.
- Firebase Authentication with email/password, verification links, password-reset links, Google sign-in, Firebase TOTP two-factor authentication, persistent sign-in cooldowns, and Firebase Admin HttpOnly server sessions.
- SQLite + Prisma persistence with learner-owned versioned lab environments.
- AWS-compatible labs for IAM, networking, compute, storage, exposure, logs, findings, and security posture.
- Azure-compatible labs for Entra ID, RBAC, networking, storage, virtual machines, monitoring, audit, and security posture.
- Native KQL parser/AST/evaluator over stored training datasets.
- Microsoft Sentinel alert/incident workflows and Defender XDR investigation timelines built from shared security events.
- Server-side validation for all 30 labs, unique cryptographic completion flags, and achievements.
- Student, Instructor, and Administrator roles with server-side authorization.
- Instructor learner assignments and seat/time-limited enrollment links; public student self-signup is disabled.
- Per-lab **Ask a Doubt** conversations with protected screenshot capture/upload and continuous student-instructor chat.
- Administrator user/role/suspension, curriculum, maintenance, quota, health, audit, performance, and support controls.
- User support tickets with private conversations, administrator replies, and ticket lifecycle management.
- Windows-first setup, SQLite backup/restore, Cloudflare Tunnel deployment guidance, and Linux + Windows release gates.

## Quick start — Windows

### 1. Download

Clone with Git:

```powershell
git clone https://github.com/nadeemmhdm/cyber-lab-studio.git
cd cyber-lab-studio
```

Or use **GitHub → Code → Download ZIP**, extract the archive, and open PowerShell inside the extracted folder.

### 2. Run the first-time setup

Requirements: **Node.js 24.12+** and a Firebase project.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\windows-setup.ps1
```

The setup script installs the locked dependency graph, generates Prisma, creates the SQLite schema, seeds roles and all 30 labs, and creates `.env` from `.env.example` when needed.

### 3. Configure Firebase and `.env`

Enable **Email/Password** and **Google** in Firebase Authentication. Add `localhost` and any future public hostname to Firebase Authentication **Authorized domains**.

Fill the Firebase Web + Admin values and a strong `SESSION_SECRET` in `.env`.

CyberLab does **not** require application-level `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`; Google identity is configured through Firebase Console.

### 4. Create the first administrator

Generate a strong one-time setup token and place it in `.env`:

```env
INITIAL_ADMIN_SETUP_TOKEN="replace-with-at-least-32-random-characters"
INITIAL_ADMIN_EMAIL="admin@example.com"
```

`INITIAL_ADMIN_EMAIL` is optional; when set, the first administrator must use that address. Then:

1. Start CyberLab with `npm run dev`.
2. Open `http://localhost:3000/setup`.
3. Enter the setup token, administrator display name, email, and a strong password.
4. Confirm `/admin` opens.
5. Remove `INITIAL_ADMIN_SETUP_TOKEN` from `.env` and restart CyberLab.

The first-run endpoint becomes permanently unavailable after an Administrator exists. Administrators provision Instructor accounts; Instructors generate seat-limited, expiring enrollment links so students can choose their own username/password. There is no public student self-signup.

### 5. Run

Development:

```powershell
npm run dev
```

Production-style local run:

```powershell
.\scripts\windows-start.ps1
```

Open `http://localhost:3000`.

Full setup details: [`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md)

## Public HTTPS access with Cloudflare Tunnel

CyberLab can remain on the local Windows machine while Cloudflare Tunnel publishes only the web service.

Install and authenticate cloudflared:

```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel login
cloudflared tunnel create cyberlab
cloudflared tunnel route dns cyberlab cyberlab.example.com
```

Copy `deploy/cloudflared/config.example.yml` to your local config and replace the tunnel UUID, credentials path, and hostname. Set:

```env
APP_URL="https://cyberlab.example.com"
```

Add the same hostname to Firebase Authentication **Authorized domains**, restart CyberLab, then run:

```powershell
cloudflared tunnel --config .\deploy\cloudflared\config.yml run cyberlab
```

The tunnel should route only `http://localhost:3000`. Do **not** expose SQLite, Prisma Studio, filesystem shares, or internal development ports.

For Internet-facing deployments, configure **Cloudflare Access** as an additional perimeter layer for `/admin*` and `/setup*` (and optionally `/instructor*`) while keeping CyberLab's own Firebase session and role checks enabled.

Full deployment guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Backup and restore

Stop CyberLab before a release backup:

```powershell
npm run backup
```

Restore requires an explicit confirmation variable:

```powershell
$env:CONFIRM_RESTORE="YES"
npm run restore -- backups\<backup-file>.bak
Remove-Item Env:CONFIRM_RESTORE
```

The restore utility preserves a pre-restore safety copy. See [`docs/BACKUP-RESTORE.md`](docs/BACKUP-RESTORE.md).

## Learning model

| Area | Labs | Primary workflow |
| --- | ---: | --- |
| Cloud fundamentals | 01–02 | shared responsibility + IAM reasoning |
| AWS | 03–18 | identity, VPC/routing, SG/NACL, EC2, patching, S3, encryption, snapshots |
| Azure | 19–22 | Entra ID, RBAC, networking/storage, compute/monitoring |
| Sentinel | 23–24 | workspaces, ingestion, detections, alerts/incidents |
| KQL | 25–26 | filtering, projection, aggregation, security investigation |
| Defender XDR | 27–30 | alerts/incidents, devices, identity, execution, privilege, lateral movement |

Modes:

- **Guided** — concepts, tasks, hints, and complete solution according to administrator policy.
- **Practice** — hands-on workflow with guidance available according to policy.
- **Challenge** — concepts/hints/solution hidden; server validation still required.

Task progress can reach only 99%. A lab reaches 100% only when the authenticated server validates persisted evidence and transactionally issues completion, flag, audit evidence, and any earned achievements.

## Support and administration

Signed-in users can open `/support` to report lab, account, access, content, or platform issues. Users see only their own support conversations.

Inside each lab workspace, a student can open **Ask a Doubt**, capture a selected screen/window or upload a PNG/JPEG/WebP screenshot under 2 MB, and continue a private conversation with the assigned instructor. Screenshots are served only through authenticated, authorized routes.

Administrators can see the reporter account, roles, account status, conversation history, category/priority, reply directly, and move support tickets through `OPEN`, `IN_PROGRESS`, `RESOLVED`, and `CLOSED`.

The Admin control center also manages student/instructor/admin accounts, roles, suspension, password reset, instructor provisioning, learning-mode policy, hints/solutions, lab availability, platform maintenance/quotas, audit history, database health, and performance telemetry.

## Quality and release verification

```powershell
npm ci
npm audit --audit-level=moderate
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run release:check
npm run build
```

The dedicated release E2E suite creates two learners in the same AWS lab, mutates one learner's environment, proves the second environment/history remain unchanged, and verifies cross-user environment access is rejected.

CI includes a Linux validation job and a Windows smoke/release job.

## Security principles

- Browser code never receives Firebase Admin credentials, database secrets, hidden validator internals, or production cloud credentials.
- Authentication, role scope, environment ownership, maintenance/quota policy, validation, completion, and privileged mutations are enforced server-side.
- State-changing APIs use same-origin/CSRF protections as appropriate plus scoped rate/body limits.
- Session cookies are HttpOnly, `SameSite=Strict`, and `Secure` in production.
- Global CSP/HSTS/clickjacking/MIME/referrer/permissions controls harden the web surface.
- The dependency graph is locked; CI uses `npm ci` and blocks on moderate-or-higher npm audit findings.
- Unsupported training operations return explicit errors instead of fake success.

See [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) and [`SECURITY.md`](SECURITY.md).

## Documentation

- [`GETTING-STARTED.md`](docs/GETTING-STARTED.md) — download, Firebase, first admin, and local run.
- [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Windows production process, Cloudflare Tunnel, and Access guidance.
- [`BACKUP-RESTORE.md`](docs/BACKUP-RESTORE.md) — SQLite backup and recovery runbook.
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application and trust boundaries.
- [`AUTHENTICATION.md`](docs/AUTHENTICATION.md) — Firebase identity/session design.
- [`LAB-ENGINE.md`](docs/LAB-ENGINE.md) — versioned isolated learner state and E2E isolation.
- [`AWS-ENVIRONMENT.md`](docs/AWS-ENVIRONMENT.md) — AWS-compatible training workflow.
- [`AZURE-ENVIRONMENT.md`](docs/AZURE-ENVIRONMENT.md) — Azure-compatible training workflow.
- [`KQL-ENGINE.md`](docs/KQL-ENGINE.md) — KQL parser/evaluator subset.
- [`SECURITY-OPERATIONS.md`](docs/SECURITY-OPERATIONS.md) — Sentinel + Defender shared investigation model.
- [`CURRICULUM.md`](docs/CURRICULUM.md) — all 30 labs, modes, tasks, hints, and solutions.
- [`VALIDATION-AND-ACHIEVEMENTS.md`](docs/VALIDATION-AND-ACHIEVEMENTS.md) — validators, completion, flags, and achievements.
- [`ACCOUNT-ONBOARDING.md`](docs/ACCOUNT-ONBOARDING.md) — first admin, instructor provisioning, enrollment links, username login, cooldowns, and TOTP MFA.
- [`ACCOUNT-ONBOARDING.md`](docs/ACCOUNT-ONBOARDING.md) — first admin, instructor provisioning, enrollment links, username login, cooldowns, and TOTP MFA.
- [`MANAGEMENT.md`](docs/MANAGEMENT.md) — instructor, admin, enrollment, and support management.
- [`PLATFORM-HARDENING.md`](docs/PLATFORM-HARDENING.md) — security, performance, and accessibility controls.
- [`COMPATIBILITY.md`](docs/COMPATIBILITY.md) — implemented command/workflow matrix.
- [`BRANCH-PROTECTION.md`](docs/BRANCH-PROTECTION.md) — recommended GitHub main-branch ruleset.
- [`RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md) — v1 release gate.
- [`ROADMAP.md`](docs/ROADMAP.md) — implementation history.

## Release artifacts

- [CyberLab Studio Pro v1.0.0 — Product & Architecture Presentation](docs/artifacts/CyberLab-Studio-Pro-v1.0.0.pptx)
- [CyberLab Studio Pro v1.0.0 — Complete 30-Lab Manual & Solutions](docs/artifacts/CyberLab-Studio-Pro-Lab-Manual-v1.0.0.docx)

## Repository protection

The desired `main` branch rules are documented in [`docs/BRANCH-PROTECTION.md`](docs/BRANCH-PROTECTION.md). Branch rulesets are a GitHub repository-admin setting and must be enabled in **Settings → Rules → Rulesets** by a repository administrator.

## License

MIT — see [`LICENSE`](LICENSE).
