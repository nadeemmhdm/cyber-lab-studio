# CyberLab Studio Pro

CyberLab Studio Pro is a multi-user cybersecurity training platform for hands-on AWS, Microsoft Azure, Microsoft Sentinel, KQL, and Microsoft Defender XDR learning.

## Current status

Phases 1–9 are implemented. The platform has a responsive Next.js UI, SQLite/Prisma persistence, Firebase Authentication, a 30-lab catalogue, versioned per-student lab environments, deterministic reset before verified completion, persisted progress/history, cross-user isolation, native AWS and Azure simulators, a KQL AST evaluator, Microsoft Sentinel detection/incident workflows, Defender XDR investigation state built from shared synthetic security events, complete Version 2 educational curriculum for all 30 labs, and server-authoritative validation with transactional completion, cryptographic per-user flags, and verified achievements.

The dependency graph is locked with `package-lock.json`; CI uses `npm ci` and blocks on `npm audit --audit-level=moderate`.

## Stack

- Next.js App Router + React + strict TypeScript
- Tailwind CSS
- SQLite + Prisma ORM
- Firebase Authentication + Firebase Admin session cookies
- Native AWS and Azure state simulators
- Native KQL parser/AST/evaluator
- Shared Sentinel/Defender XDR synthetic security-event model
- Versioned 30-lab educational content registry
- Server-side 30-lab validation registry
- Transactional completion/flag/achievement services
- Zod validation
- Vitest

## Local setup

1. Install Node.js 24.12+.
2. Create a Firebase project and enable Email/Password and Google providers in Firebase Authentication.
3. Add your local/production hostnames to Firebase Authorized domains.
4. Copy `.env.example` to `.env` and provide the Firebase Web + Admin values.
5. Install the locked dependency graph: `npm ci`.
6. Create/update SQLite schema: `npx prisma db push`.
7. Seed labs, simulator state, and Phase 8 Version 2 curriculum: `npm run db:seed`.
8. Start development: `npm run dev`.
9. Open `http://localhost:3000`.

No `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is required by CyberLab. Google identity is configured through Firebase Console.

## Simulator surfaces

AWS labs use the native CyberLab AWS CLI simulator; Azure labs use the native Azure CLI simulator. Sentinel, KQL, and Defender XDR labs use the shared security dataset and KQL engine.

Examples:

```text
aws sts get-caller-identity
aws ec2 describe-security-groups
az account show
az network nsg list --resource-group cyberlab-rg
SigninLogs | where RiskLevel == "high" | project TimeGenerated, UserPrincipalName, IPAddress
DeviceProcessEvents | where ProcessCommandLine contains "powershell" | summarize Total=count() by DeviceName
```

The native simulators never forward input to a host shell or real cloud account. Unsupported operations fail explicitly.

## Educational modes

- **Guided** — concepts, tasks, three progressive hints, and the full educational solution are available.
- **Practice** — keeps the curriculum and solution available while learners perform the real simulator/query workflow themselves.
- **Challenge** — hides concepts, hints, and solutions according to the lab-mode policy.

Opening a hint or solution never grants completion. Task workflow is capped below 100%; the authenticated server validates persisted evidence before issuing the completion record and unique flag. Verified labs are then locked against environment reset so an earned completion remains tied to the state that was certified.

## Validation and achievements

Each of the 30 labs has a server-side validator profile. Depending on the lab, validation can use successful terminal history, successful KQL history, persisted simulator state, state-derived findings, and persisted Sentinel/Defender investigation actions. Read-only investigation labs are not forced to perform fake mutations.

Successful validation atomically records the passing validation result, marks the attempt passed, moves progress to 100%, creates the completion record, issues one cryptographically random `CYBERLAB{...}` flag, writes an audit event, and evaluates achievements. Failed validation creates no completion or flag. Re-validating an already completed lab returns the same existing flag rather than creating duplicates.

## Useful commands

```bash
npm ci
npm audit --audit-level=moderate
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:seed
npm run db:studio
```

## Security principles

- Firebase Web SDK handles identity; Firebase Admin verifies server sessions.
- Browser code never receives Firebase Admin credentials, database secrets, hidden validator internals, or real cloud credentials.
- Completion flags are generated only after successful server-side validation and are globally unique in the database.
- Authentication state for CyberLab is an HttpOnly server session cookie, not localStorage.
- Simulator commands use registries and internal state only; host-shell execution is prohibited.
- KQL executes only against stored synthetic training tables.
- Sentinel analytics rules create alerts only from real KQL matches in the learner environment.
- Defender XDR correlations reference the same stored event IDs used by KQL and Sentinel.
- Student lab environments are isolated by user + lab + version.
- Educational hints/solutions do not contain flags or hidden validator internals.
- Unsupported simulator operations return explicit errors rather than fake success.
- CI audits the locked npm dependency graph and fails on moderate-or-higher findings.

## Documentation

- `docs/AUTHENTICATION.md` — Firebase identity/session design
- `docs/ARCHITECTURE.md` — system boundaries
- `docs/PHASE4.md` — lab-engine guarantees
- `docs/AWS-SIMULATOR.md` — AWS simulator architecture
- `docs/AZURE-SIMULATOR.md` — Azure simulator architecture
- `docs/KQL-ENGINE.md` — KQL parser/evaluator architecture and subset
- `docs/SECURITY-OPERATIONS.md` — Sentinel + Defender XDR shared investigation model
- `docs/PHASE8-CONTENT.md` — Version 2 educational content architecture
- `docs/PHASE9.md` — validation, completion, flags, achievements, and leakage controls
- `docs/COMPATIBILITY.md` — implemented compatibility matrix
- `docs/ROADMAP.md` — implementation phases
- `SECURITY.md` — vulnerability reporting and security rules

## License

MIT
