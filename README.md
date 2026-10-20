# CyberLab Studio Pro

[![CI](https://github.com/nadeemmhdm/cyber-lab-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/nadeemmhdm/cyber-lab-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/release-v1.0.0-2563eb)](#release)

**CyberLab Studio Pro** is a multi-user cloud-security training platform with 30 versioned labs across cloud fundamentals, AWS-compatible administration, Azure-compatible administration, KQL, Microsoft Sentinel workflows, and Defender XDR investigations.

Supported lab commands operate inside isolated learner environments with persistent state, real permission/state transitions, explicit errors, server-side validation, unique completion flags, and per-user progress. The default release does not forward learner AWS/Azure commands to the host shell or to production cloud accounts.

## Release

**CyberLab Studio Pro — Complete Lab Platform**  
**Version:** `v1.0.0`

All twelve implementation phases are complete: architecture, Firebase authentication, product UI, isolated lab state, AWS-compatible workflows, Azure-compatible workflows, KQL/Sentinel/Defender, complete curriculum, validation/flags, instructor/admin management, security/performance/accessibility hardening, and Windows/Linux deployment verification.

## What ships

- 30 complete labs with concepts, scenarios, four-task workflows, three progressive hint levels, detailed solutions, expected evidence, verification, common mistakes, and troubleshooting.
- Firebase Authentication with email/password, verification/reset links, Google sign-in, Firebase TOTP 2FA, sign-in cooldowns, and HttpOnly server sessions.
- SQLite + Prisma persistence with learner-owned versioned environments.
- AWS-compatible IAM, networking, compute, storage, exposure, logs, findings, and posture workflows.
- Azure-compatible Entra ID, RBAC, networking, storage, VM, monitoring, audit, and posture workflows.
- Native KQL parser/AST/evaluator over persisted security datasets.
- Microsoft Sentinel alert/incident workflows and Defender XDR investigation timelines.
- Server-side validation for all 30 labs, unique cryptographic completion flags, and achievements.
- Admin-created Instructor accounts and Instructor-generated seat/time-limited Student enrollment links.
- Per-lab **Ask a Doubt** chat with protected screenshot capture/upload and continuous Student–Instructor replies.
- User support tickets with Administrator replies and lifecycle management.
- Smooth responsive UI/UX, accessible motion, Linux + Windows CI, backup/restore, and Cloudflare Tunnel deployment.

# True one-line installation

You do **not** need to clone this repository manually.

The installer clones or updates CyberLab, checks prerequisites, installs a verified local Node.js runtime when needed, installs the approved package graph, checks outdated packages, runs the dependency audit, collects Firebase configuration in the terminal, creates the SQLite schema, seeds all labs, creates the first Administrator account, configures public access, and starts CyberLab.

## Windows PowerShell — copy and paste one command

```powershell
iex (irm 'https://raw.githubusercontent.com/nadeemmhdm/cyber-lab-studio/main/install.ps1')
```

## Windows CMD — copy and paste one command

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm 'https://raw.githubusercontent.com/nadeemmhdm/cyber-lab-studio/main/install.ps1')"
```

## Linux — copy and paste one command

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/nadeemmhdm/cyber-lab-studio/main/install.sh)"
```

> The Linux command intentionally uses `bash -c "$(curl ...)"` instead of piping directly into Bash so the terminal remains available for the interactive Firebase/Admin setup questions.

Default installation directory:

- Windows: `%USERPROFILE%\CyberLab-Studio`
- Linux: `~/CyberLab-Studio`

## What the one-line installer does

On a fresh machine it:

1. checks for Git and installs it when a supported OS package manager is available;
2. clones `nadeemmhdm/cyber-lab-studio` from `main`;
3. checks Node.js and npm;
4. if Node.js 24.12+ is missing or old, downloads the official Node.js 24.12.0 runtime into `.cyberlab/runtime` and verifies the Node.js SHA-256 checksum;
5. installs the repository's approved dependency graph;
6. detects newer package versions, applies non-breaking updates permitted by the tested package ranges, and reports major-version jumps instead of silently forcing them;
7. runs `npm audit --audit-level=moderate` and stops if unresolved moderate-or-higher findings remain;
8. asks for Firebase Web configuration in the terminal;
9. asks for a Firebase service-account JSON path, or collects Firebase Admin fields manually;
10. generates `SESSION_SECRET` and the one-time Administrator bootstrap token;
11. writes local `.env` values without committing secrets;
12. generates Prisma, creates/updates SQLite, and seeds all 30 labs;
13. asks for Administrator email, display name, and password, then creates the first Administrator directly through Firebase Admin + CyberLab RBAC;
14. removes the one-time bootstrap token after successful Administrator creation;
15. asks for public-access mode;
16. installs `cloudflared` locally when needed;
17. starts CyberLab and the selected Cloudflare Tunnel.

Public Student self-signup remains disabled. Administrators create Instructor accounts. Instructors choose a Student seat count and expiry, generate one enrollment link, and exactly that configured number of Students can choose their own username/password through the link.

# Firebase setup collected in the terminal

The installer asks for:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- Firebase Admin service-account JSON path, or:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

It generates and manages:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `INITIAL_ADMIN_SETUP_TOKEN`
- `INITIAL_ADMIN_EMAIL`

Enable **Email/Password** in Firebase Authentication. Enable **Google** if Google sign-in is required. CyberLab does **not** require application-level `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`; Google identity is configured through Firebase.

# Cloudflare public access during the same install

The installer offers:

### 1. Quick worldwide HTTPS URL

No Cloudflare account is required. CyberLab downloads `cloudflared`, starts a Quick Tunnel, detects the generated `https://....trycloudflare.com` URL, updates `APP_URL`, attempts to add the hostname to Firebase Authorized Domains, builds CyberLab, starts the app, and keeps the tunnel attached to the running process.

The Quick Tunnel URL is temporary and can change after restart.

### 2. Permanent Cloudflare hostname

Choose this for a stable production-style hostname such as `lab.example.com`.

The installer:

- opens Cloudflare authorization once;
- creates/reuses the named tunnel;
- creates the DNS route;
- writes `deploy/cloudflared/config.yml`;
- updates `APP_URL`;
- attempts to add the hostname to Firebase Authorized Domains;
- starts the app and named tunnel.

Cloudflare browser authorization cannot be bypassed and must be approved by the account owner. Automatic Firebase Authorized Domain configuration also depends on the service account having `firebaseauth.configs.update`; if that permission is unavailable, the installer prints the exact hostname that must be added manually.

Only `http://localhost:3000` is exposed. Do not expose SQLite, Prisma Studio, filesystem shares, or internal development ports.

# Run the same one-line command again to update

Re-running the same Windows/Linux one-line installer on an existing installation:

- refuses to overwrite uncommitted local changes;
- performs a clean `git pull --ff-only`;
- checks/install packages;
- checks outdated package versions;
- runs the security audit;
- regenerates Prisma and applies the SQLite schema;
- reseeds idempotent platform data;
- opens the CyberLab management menu.

Major dependency-version jumps are intentionally held for a tested repository release instead of being force-installed on a production lab server.

# Installed management CLI

After the first installation, the local management tool remains available.

Windows:

```bat
cd %USERPROFILE%\CyberLab-Studio
cyberlab.cmd
```

Linux:

```bash
cd ~/CyberLab-Studio
bash ./cyberlab.sh
```

Available management actions include setup/repair, local web setup wizard, update, development/production start, Cloudflare Tunnel, and Doctor diagnostics.

When Node 24.12+ is already available, npm aliases are also available:

```bash
npm run cyberlab
npm run setup
npm run setup:web
npm run doctor
npm run update
npm run tunnel
```

Detailed installer and CLI behavior: [`docs/UNIFIED-SETUP.md`](docs/UNIFIED-SETUP.md)

# Optional local setup web UI

For an already cloned/installed CyberLab checkout, the management CLI can open a setup-only local web UI bound to `127.0.0.1:3210`.

Windows:

```bat
cyberlab.cmd web
```

Linux:

```bash
bash ./cyberlab.sh web
```

The setup UI is loopback-only and can collect Firebase Web config, Firebase service-account JSON, Administrator credentials, and package-update preference. It is not exposed by the Cloudflare Tunnel.

# Backup and restore

Create a SQLite backup while the application is stopped:

```bash
npm run backup
```

Restore requires explicit confirmation. See [`docs/BACKUP-RESTORE.md`](docs/BACKUP-RESTORE.md).

# Learning model

| Area | Labs | Primary workflow |
| --- | ---: | --- |
| Cloud fundamentals | 01–02 | shared responsibility + IAM reasoning |
| AWS | 03–18 | identity, VPC/routing, SG/NACL, EC2, patching, S3, encryption, snapshots |
| Azure | 19–22 | Entra ID, RBAC, networking/storage, compute/monitoring |
| Sentinel | 23–24 | workspaces, ingestion, detections, alerts/incidents |
| KQL | 25–26 | filtering, projection, aggregation, security investigation |
| Defender XDR | 27–30 | alerts/incidents, devices, identity, execution, privilege, lateral movement |

Modes:

- **Guided** — concepts, tasks, hints, and complete solution according to Administrator policy.
- **Practice** — hands-on workflow with guidance available according to policy.
- **Challenge** — concepts/hints/solution hidden; server validation still required.

Task progress reaches at most 99% through normal task interactions. A lab reaches 100% only after authenticated server-side validation of persisted evidence.

# Support and administration

- `/support` — private user support conversations with Administrator replies.
- **Ask a Doubt** inside a lab — private Student–Instructor chat with authorized PNG/JPEG/WebP screenshots under 2 MB.
- Administrator controls — users, roles, suspension, password reset, Instructor provisioning, learning policies, lab availability, quotas, maintenance, audit, health, performance, support, and curriculum.
- Instructor controls — assigned Students, progress, seat-limited enrollment links, and doubt conversations.

# Quality gates

```bash
npm ci
npm audit --audit-level=moderate
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run release:check
npm run build
```

CI validates Linux and Windows, including installer/bootstrap checks. The release E2E suite verifies two-user isolation by mutating one learner environment and proving the second learner state/history cannot be accessed or changed.

# Security principles

- `.env` and service-account credentials stay local and are never committed by the installer.
- Firebase Admin credentials, database secrets, hidden validators, and cloud credentials never ship to browser code.
- Authentication, RBAC, environment ownership, maintenance/quota policy, completion, and privileged changes are server-enforced.
- State-changing APIs use origin/CSRF protections plus scoped rate/body limits.
- Session cookies are HttpOnly, `SameSite=Strict`, and `Secure` in production.
- Dependency installs are lockfile-based; the installer and CI do not use forced breaking audit upgrades.
- Unsupported lab operations return explicit errors rather than fake success.

See [`SECURITY.md`](SECURITY.md) and [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md).

# Documentation

- [`UNIFIED-SETUP.md`](docs/UNIFIED-SETUP.md) — remote one-line installer, CLI, update, Firebase/Admin setup, web wizard, and Cloudflare Tunnel.
- [`GETTING-STARTED.md`](docs/GETTING-STARTED.md) — platform prerequisites and first run.
- [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) — production process and Cloudflare deployment.
- [`BACKUP-RESTORE.md`](docs/BACKUP-RESTORE.md) — SQLite backup/recovery.
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application and trust boundaries.
- [`AUTHENTICATION.md`](docs/AUTHENTICATION.md) — Firebase identity/session architecture.
- [`ACCOUNT-ONBOARDING.md`](docs/ACCOUNT-ONBOARDING.md) — Administrator/Instructor/Student onboarding, cooldowns, and TOTP MFA.
- [`LAB-ENGINE.md`](docs/LAB-ENGINE.md) — isolated learner state and E2E isolation.
- [`AWS-ENVIRONMENT.md`](docs/AWS-ENVIRONMENT.md) — AWS-compatible workflow coverage.
- [`AZURE-ENVIRONMENT.md`](docs/AZURE-ENVIRONMENT.md) — Azure-compatible workflow coverage.
- [`KQL-ENGINE.md`](docs/KQL-ENGINE.md) — KQL parser/evaluator.
- [`SECURITY-OPERATIONS.md`](docs/SECURITY-OPERATIONS.md) — Sentinel + Defender investigation model.
- [`CURRICULUM.md`](docs/CURRICULUM.md) — all 30 labs, tasks, hints, and solutions.
- [`VALIDATION-AND-ACHIEVEMENTS.md`](docs/VALIDATION-AND-ACHIEVEMENTS.md) — validators, completion, flags, achievements.
- [`MANAGEMENT.md`](docs/MANAGEMENT.md) — Instructor/Admin/support management.
- [`PLATFORM-HARDENING.md`](docs/PLATFORM-HARDENING.md) — security, performance, accessibility.
- [`COMPATIBILITY.md`](docs/COMPATIBILITY.md) — supported command/workflow matrix.
- [`RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md) — release verification.
- [`ROADMAP.md`](docs/ROADMAP.md) — implementation history.

# Release artifacts

- [CyberLab Studio Pro v1.0.0 — Product & Architecture Presentation](docs/artifacts/CyberLab-Studio-Pro-v1.0.0.pptx)
- [CyberLab Studio Pro v1.0.0 — Complete 30-Lab Manual & Solutions](docs/artifacts/CyberLab-Studio-Pro-Lab-Manual-v1.0.0.docx)

# License

MIT — see [`LICENSE`](LICENSE).
