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
- Student, Instructor, and Administrator roles with server-side authorization.
- Admin-created Instructor accounts and Instructor-generated seat/time-limited Student enrollment links.
- Per-lab **Ask a Doubt** chat with protected screenshot capture/upload and continuous Student–Instructor replies.
- User support tickets with Administrator replies and lifecycle management.
- Smooth responsive UI/UX, accessible motion, reduced-motion support, Linux + Windows CI, backup/restore, and Cloudflare Tunnel deployment.

# One-command install and setup

Download with Git:

```bash
git clone https://github.com/nadeemmhdm/cyber-lab-studio.git
cd cyber-lab-studio
```

You can also use **GitHub → Code → Download ZIP**, extract it, and open a terminal in the extracted folder.

## Windows

Open Command Prompt or PowerShell in the repository folder:

```bat
cyberlab.cmd
```

## Linux

```bash
bash ./cyberlab.sh
```

That is the primary CyberLab management command. If Node.js 24.12+ is missing or too old, the bootstrap downloads the official Node.js 24.12.0 runtime into `.cyberlab/runtime`, verifies the Node.js SHA-256 checksum, and uses the repo-local runtime instead of replacing the system Node installation.

The menu provides:

1. **Setup / repair**
2. **Web setup wizard**
3. **Update CyberLab + packages**
4. **Start development server**
5. **Start production server**
6. **Configure Cloudflare Tunnel**
7. **Doctor**
8. **Exit**

Detailed command reference: [`docs/UNIFIED-SETUP.md`](docs/UNIFIED-SETUP.md)

## What first-time setup does

Run directly if you do not want the menu:

Windows:

```bat
cyberlab.cmd setup
```

Linux:

```bash
bash ./cyberlab.sh setup
```

The setup flow automatically:

- checks Node/npm and repository prerequisites;
- installs the locked dependency graph;
- detects outdated direct packages;
- automatically updates same-major package versions;
- holds major-version jumps for review instead of applying breaking upgrades silently;
- runs `npm audit --audit-level=moderate` and only non-force remediation;
- creates/updates `.env` through an interactive wizard;
- accepts a Firebase service-account JSON path and extracts server credentials;
- generates `SESSION_SECRET` and the one-time first-admin token;
- generates Prisma, creates/updates SQLite, and seeds all platform/lab data;
- optionally creates the first Administrator account in the same command;
- removes the one-time admin token after successful Administrator provisioning;
- optionally configures Cloudflare Tunnel;
- optionally starts CyberLab.

Public Student self-signup is disabled. Administrators provision Instructors. Instructors choose the Student seat count and expiry, generate one enrollment link, and that link permits exactly the configured number of Students to choose their own username/password.

## Local web setup UI

If you prefer forms instead of terminal questions:

Windows:

```bat
cyberlab.cmd web
```

Linux:

```bash
bash ./cyberlab.sh web
```

CyberLab opens a setup-only UI at `http://127.0.0.1:3210`. It is loopback-only and can collect Firebase Web config, Firebase service-account JSON, Administrator credentials, and the package-update preference. It writes local `.env`, prepares SQLite/Prisma, and can provision the first Administrator.

Stop the setup UI with `Ctrl+C` after setup.

## Firebase configuration

Before using authentication, create a Firebase project and enable the required Authentication providers:

- **Email/Password**
- **Google** if you want Google sign-in
- TOTP multi-factor support for users who enable 2FA

The setup tool collects:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

CyberLab does **not** require application-level `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`. Google identity is configured in Firebase Console.

For any public hostname, add the hostname to **Firebase Authentication → Authorized domains**.

# Update with the same tool

Windows:

```bat
cyberlab.cmd update
```

Linux:

```bash
bash ./cyberlab.sh update
```

The updater:

- performs `git pull --ff-only` only when the Git checkout is clean;
- never overwrites local uncommitted changes;
- restores the lockfile dependency graph;
- checks outdated direct packages;
- updates same-major versions automatically;
- reports major-version upgrades for release review;
- runs the dependency security audit without `--force`;
- regenerates Prisma, applies the SQLite schema, and reseeds idempotent platform data.

For a ZIP installation, source-code pulling is skipped because there is no Git history; download a new release ZIP for source upgrades.

# Cloudflare Tunnel — easy public access

Run the same tool:

Windows:

```bat
cyberlab.cmd tunnel
```

Linux:

```bash
bash ./cyberlab.sh tunnel
```

Choose one mode:

- **Quick Tunnel** — temporary `trycloudflare.com` URL routed only to `http://localhost:3000`.
- **Named Tunnel** — Cloudflare login, tunnel creation/reuse, DNS route, `deploy/cloudflared/config.yml` generation, and automatic `APP_URL=https://<hostname>` update.

If `cloudflared` is missing, the tool downloads the official Cloudflare release binary into `.cyberlab/bin` instead of requiring a system-wide install.

After configuring a named tunnel, add the hostname to Firebase Authentication **Authorized domains**, restart CyberLab, and run the tunnel. Never expose SQLite, Prisma Studio, filesystem shares, or unrelated local ports.

Full deployment guidance: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

# Start and diagnostics

Interactive menu:

```bat
cyberlab.cmd
```

or

```bash
bash ./cyberlab.sh
```

Direct diagnostics:

```bat
cyberlab.cmd doctor
```

```bash
bash ./cyberlab.sh doctor
```

When Node 24.12+ is already available, npm aliases are also provided:

```bash
npm run cyberlab
npm run setup
npm run setup:web
npm run doctor
npm run update
npm run tunnel
```

# Backup and restore

Create a SQLite backup while the app is stopped:

```bash
npm run backup
```

Restore requires explicit confirmation. See [`docs/BACKUP-RESTORE.md`](docs/BACKUP-RESTORE.md) for the Windows/Linux runbook.

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

CI validates both Linux and Windows. The release E2E suite verifies two-user isolation by mutating one learner environment and proving the second learner state/history cannot be accessed or changed.

# Security principles

- Firebase Admin credentials, database secrets, hidden validators, and cloud credentials never ship to browser code.
- Authentication, RBAC, environment ownership, maintenance/quota policy, completion, and privileged changes are server-enforced.
- State-changing APIs use origin/CSRF protections plus scoped rate/body limits.
- Session cookies are HttpOnly, `SameSite=Strict`, and `Secure` in production.
- CSP/HSTS/clickjacking/MIME/referrer/permissions headers harden the web surface.
- Dependency installs are lockfile-based and CI blocks moderate-or-higher npm audit findings.
- Unsupported lab operations return explicit errors rather than fake success.

See [`SECURITY.md`](SECURITY.md) and [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md).

# Documentation

- [`UNIFIED-SETUP.md`](docs/UNIFIED-SETUP.md) — single-command Windows/Linux setup, update, Doctor, local web wizard, and Cloudflare Tunnel.
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
